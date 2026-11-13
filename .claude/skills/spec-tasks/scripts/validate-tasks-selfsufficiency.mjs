#!/usr/bin/env node
/**
 * validate-tasks-selfsufficiency.mjs — implementação executável dos validators de
 * AUTO-SUFICIÊNCIA especificados em spec-tasks/SKILL.md § "Validators de auto-suficiência".
 *
 * Contexto (por que este arquivo existe):
 * Até a v1.1 da spec-tasks, os 8 validators FATAL de auto-suficiência existiam APENAS
 * como prosa na SKILL.md. Nenhum código os executava — o agente gerador auto-avaliava a
 * si mesmo e emitia tasks rasas que passavam. Resultado observado em produção: tasks com
 * "informação completa em requirements.md" DENTRO da task, exatamente o que
 * NO_EXTERNAL_REFS_IN_TASKS deveria bloquear.
 *
 * Além disso, o regex originalmente especificado para NO_EXTERNAL_REFS_IN_TASKS
 * — /(ver|consultar|ler)\s+\S*\.(yaml|json|md)\b/i — era baseado em ENUMERAÇÃO DE VERBOS e
 * não pegava as formulações reais ("informação completa em requirements.md", "detalhes no
 * requirements.md", "conforme requirements.md", "origem: requirements.md"). Aqui a lógica é
 * invertida: qualquer NOME DE ARQUIVO de especificação no corpo da task é falha, com
 * allowlist explícita para os campos de rastreio legítimos.
 *
 * Uso:
 *   node validate-tasks-selfsufficiency.mjs [outputs/spec/tasks.json] [--report] [--max N] [--sources <dir>]
 *
 *   --sources  pasta do api-contracts.yaml / data-model.json do projeto (default: a pasta do
 *              tasks.json e a pai). Deles saem os gatilhos de rota e tabela do projeto
 *              (TASK_MISSING_API_CONTRACT / TASK_MISSING_PERSISTENCE_MODEL) e o requestBody de cada
 *              operação (TASK_HAS_CONCRETE_TEST_DATA). Sem eles, só o naming fixo vale.
 *
 * Saída: JSON (default) ou relatório legível (--report).
 * Exit code: 0 se nenhum FATAL; 1 se houver qualquer FATAL. Warnings nunca bloqueiam.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const MIN_SUMMARY_CHARS = 800;
const MIN_TASK_RULE_DESCRIPTION = 200;
const MIN_ARCH_DECISIONS = 3;
const MIN_DATA_FLOW_STEPS = 10;
const MIN_ERROR_SCENARIOS = 3;

/**
 * Task de UAT: o summary é um ROTEIRO DE EXECUÇÃO HUMANA, não a transcrição de um RF — por isso
 * o mínimo é menor que MIN_SUMMARY_CHARS. Mas ele é OBRIGATÓRIO: no artefato real, 42 tasks de
 * UAT saíram com ~270 caracteres totais e NENHUMA tinha
 * `agentExecutionContext.selfContainedSummary`, embora o template da própria SKILL.md o
 * prescreva para elas. O gerador não cumpriu o template e nada reprovou.
 */
const MIN_UAT_SUMMARY_CHARS = 200;

/** Timebox máximo de um spike antes de deixar de ser investigação e virar entrega. */
const MAX_SPIKE_TIMEBOX_DAYS = 5;
const MIN_SPIKE_DESCRIPTION_CHARS = 80;

/**
 * Classes isentas do contrato técnico (SKILL.md § "Classes de task e validators aplicáveis").
 * `uat` — validação humana, sem código. `spike` — investigação com timebox: não tem contrato de
 * API, modelo de dados nem cenário com testData, porque o resultado é uma DECISÃO. Ambas têm
 * gate próprio (UAT_TASK_HAS_SUMMARY, SPIKE_TASK_COMPLETE) — isenção não é ausência de gate.
 */
const CLASS_EXEMPT_TECHNICAL = new Set(['uat', 'spike']);

/**
 * NO_EXTERNAL_REFS_IN_TASKS — detecção por PADRÃO DE NOME DE ARQUIVO, não por verbo.
 *
 * Distinção que importa (aprendida em caso real): o implementador recebe
 * `tasks.json` + **as rules do projeto**. Logo:
 *  - citar um ARTEFATO DE ESPECIFICAÇÃO (requirements.md, business-rules.md, data-model.json…)
 *    é FATAL — esse arquivo não está na mão de quem implementa;
 *  - citar um arquivo de RULES (`*.mdc`, `security.md`, `frontend.md`…) é legítimo — está.
 */
const SPEC_FILE_PATTERN = /\b[\w][\w.-]*\.(ya?ml|json|md)\b/gi;

/** Artefatos do pipeline SDD que o implementador NÃO possui → citar é FATAL. */
const SPEC_ARTIFACTS = new Set([
  'requirements.md',
  'product-requirements.md',
  'business-rules.md',
  'data-model.json',
  'data-model_change.json',
  'api-contracts.yaml',
  'api-contracts.yml',
  'api-contracts-supplement.json',
  'context-map.md',
  'discovery-document.md',
  'legacy.md',
  'legacy-analysis.md',
  'prototype.md',
  'benchmark.md',
  'product-vision.md',
  'modules.md',
  'flow-map.md',
  'threat-model.md',
  'architecture.md',
  'gaps.md',
  'gaps-answers.md',
  'gaps-document.md',
  'business-map.json',
  'screens-manifest.json',
  'scope-change-analysis.md',
  'test-plan.md' // FATAL para functional/security; isento em class=uat
]);

/** Arquivos de rules: disponíveis ao implementador → citar é permitido. */
const RULES_FILE_PATTERN = /\.mdc$/i;
const RULES_FILE_NAMES = new Set([
  'security.md', 'frontend.md', 'backend.md', 'architecture.mdc', 'conventions.md',
  'database.md', 'auth.md', 'observability.md', 'test-strategy.md',
  'deploy-and-build.md', 'integrations.md', 'messaging-and-queue.md',
  'claude.md', 'agents.md', 'readme.md'
]);

/**
 * Chaves cujo VALOR é legitimamente um caminho/nome de arquivo (rastreabilidade).
 * `document` só é aceito quando o objeto irmão traz `excerpt` — isto é, quando o
 * CONTEÚDO está embutido e o nome do arquivo é só procedência.
 */
const FILE_REF_ALLOWED_KEYS = new Set([
  'openApiRef',
  'dataModelRef',
  'screenshot',
  'sourceDocument',
  'sourceFile',
  'specRef',
  'path',             // path de endpoint HTTP, não de arquivo
  'exactTestCommands', // comandos podem citar arquivos de teste
  'files',            // visualReferences.files[]
  'source'            // objeto {document, section, excerpt} — validado à parte
]);

/**
 * Ponteiro para documento externo SEM nome de arquivo — a via de fuga do SPEC_FILE_PATTERN.
 * Casos reais que motivaram: "informação completa em requirements.md" (pega pelo nome), mas
 * também "ver o documento de requisitos", "consultar o arquivo de negócio", "§4.2 do
 * business-rules" — que não têm nome de arquivo nenhum.
 *
 * ------------------------------------------------------------------------------------------
 * CORREÇÃO (v1.3) — a versão anterior gerava FATAL em PROSA PT-BR LEGÍTIMA.
 * O gatilho aceitava `regras|lista|valores|critérios|descrição` + até 3 palavras +
 * `requisitos?|especificação`. Mas "requisitos" e "regras de negócio" são expressões
 * CORRENTES em português técnico, não ponteiros. Reprovavam, indevidamente:
 *   "As regras de negócio e requisitos funcionais aplicáveis…"
 *   "Critérios de aceite derivados dos requisitos do módulo…"
 *   "Lista de requisitos atendidos: RF-01, RF-02, RF-03."
 *   "Valores permitidos conforme a especificação do enum StatusProposta: ATIVO, INATIVO…"
 * Nenhuma delas remete a nada — todas TRAZEM conteúdo. FATAL nesses casos desacredita o gate.
 *
 * A regra passa a exigir um MARCADOR DE DOCUMENTO EXTERNO, e só então é FATAL:
 *   (M1) substantivo de ARTEFATO (documento/documentação/arquivo/artefato/anexo/planilha)
 *        precedido de verbo de remissão — "ver o documento de", "consultar o arquivo";
 *   (M2) o mesmo substantivo em posição de destino, apontando para assunto de
 *        especificação — "no documento de requisitos", "conforme o artefato de negócio";
 *   (M3) construção inequívoca de remissão — "conforme descrito em", "conforme definido no";
 *   (M4) referência a SEÇÃO de documento — "§4.2", "seção 4.2", 'seção "Regras"'.
 * Nome de arquivo (`*.md`, `*.json`, `*.yaml`) já é coberto por SPEC_FILE_PATTERN acima.
 *
 * Calibração (mantida): há referências internas LEGÍTIMAS com redação parecida, observadas
 * em backlog real —
 *   "a resposta segue exatamente o contrato descrito em apiContracts desta task"
 *   "índices e constraints descritas em persistenceModel"
 *   "política de rate limiting descrita em auth.mdc §3"
 * Todas apontam para campo DA PRÓPRIA task, para arquivo de rules ou para elemento interno,
 * que o implementador tem. Por isso qualificadores de escopo interno, nomes de campo da task
 * e referências a arquivo de rules ANULAM a deteção (ver janela de veto em checkNoExternalRefs).
 * ------------------------------------------------------------------------------------------
 */

/** Substantivos de ARTEFATO externo. Note que `especificação` NÃO está aqui de propósito:
 *  "a especificação do enum X" é prosa legítima, não ponteiro. */
const DOC_ARTIFACT_NOUN =
  String.raw`(?:documento|documenta(?:ç|c)(?:ão|ao|ões|oes)|arquivo|artefato|anexo|planilha)`;

/** Assunto típico de artefato de especificação — desambigua "arquivo de log" de "documento de requisitos". */
const SPEC_SUBJECT_NOUN =
  String.raw`(?:requisitos?|neg[óo]cio|produto|discovery|levantamento|arquitetura|` +
  String.raw`especifica(?:ç|c)(?:ão|ao|ões|oes)|refer[êe]ncia|escopo|regras\s+de\s+neg[óo]cio|` +
  String.raw`modelo\s+de\s+dados|contratos?)`;

/**
 * Marcadores de ponteiro para documento externo. Cada entrada é `{code, re}` — `code` entra na
 * mensagem para deixar explícito QUAL marcador disparou (auditabilidade do FATAL).
 */
const DOC_POINTER_MARKERS = [
  {
    marker: 'verbo+artefato',
    re: new RegExp(
      String.raw`\b(?:ver|vide|consultar|verificar|checar|acessar|abrir|ler|leia|reveja|revisar)\b\s+` +
        String.raw`(?:\w+\s+){0,2}?(?:o\s+|a\s+|os\s+|as\s+|no\s+|na\s+|em\s+|d[oa]\s+)?` +
        DOC_ARTIFACT_NOUN +
        String.raw`\b`,
      'i'
    )
  },
  {
    marker: 'artefato-de-especificação',
    re: new RegExp(
      String.raw`\b(?:em|n[oa]|d[oa]|conforme|segundo|de acordo com)\s+(?:o\s+|a\s+)?` +
        DOC_ARTIFACT_NOUN +
        String.raw`\s+(?:de|do|da|dos|das)\s+` +
        SPEC_SUBJECT_NOUN +
        String.raw`\b`,
      'i'
    )
  },
  {
    marker: 'conforme-descrito-em',
    re: /\bconforme\s+(?:descrit|definid|detalhad|especificad)[oa]s?\s+(?:em|n[oa]s?|d[oa]s?)\b/i
  },
  {
    marker: 'referência-a-seção',
    re: /(?:§\s*\d|\bse(?:ç|c)(?:ão|ao)\s+(?:\d|["“'«]))/i
  }
];

/** Anula a deteção acima: o ponteiro é para dentro da própria task / do backlog. */
const INTERNAL_SCOPE_QUALIFIER =
  /\b(desta task|deste work item|desta story|neste campo|nesta task|acima|abaixo|desta pr[óo]pria|deste documento de task)\b/i;

/** Anula a deteção: o alvo é um elemento INTERNO da própria task (passo, item, tabela, coluna). */
const INTERNAL_TARGET_NOUN =
  /\b(passo|passos|item|itens|etapa acima|tabela|coluna|colunas|campo|campos|cen[áa]rio|cen[áa]rios|algoritmo|fluxo de dados|matriz)\b/i;

/** Anula a deteção: o ponteiro é para arquivo de RULES, que o implementador possui. */
const RULES_REF_IN_WINDOW = /\.mdc\b|\b(security|frontend|backend|architecture|conventions|database|auth|observability|test-strategy|deploy-and-build|integrations|messaging-and-queue)\.mdc?\b/i;

/** Substantivos que são CAMPOS da task — ponteiro para eles é auto-referência válida. */
const TASK_FIELD_NOUNS =
  /\b(apiContracts?|persistenceModel|uiContext|businessRules|acceptanceScenarios|acceptanceCriteria|implementationGuidance|validation|agentExecutionContext|technicalRules|errorHandling|observability|testingStrategy|dataFlow)\b/i;

/**
 * Marcadores de conteúdo não resolvido — nunca devem sobreviver numa task emitida.
 *
 * ------------------------------------------------------------------------------------------
 * CORREÇÃO (v1.4) — a versão anterior era `/\b(TODO|TBD|...)\b/i` e produziu 74 de 104
 * WARNINGs num backlog real, TODOS falsos. Duas causas, ambas de PT-BR:
 *   1. `todo` é palavra corrente — "delimita **todo** o escopo de contribuintes";
 *   2. `\b` não vê acento como letra (sem flag `u`, `é` é caractere não-word), então
 *      `\btodo\b` casa o "todo" dentro de "mé|todo" — "usar o **método** de assinatura".
 * Ruído nessa escala não é inconveniência: enterra o WARNING verdadeiro e treina quem lê o
 * relatório a ignorar o código inteiro.
 *
 * A regra passa a exigir forma de PLACEHOLDER DE VERDADE, não a palavra solta:
 *   - `TODO`/`FIXME`/`XXX`/`HACK` apenas em MAIÚSCULAS e seguidos de marca de anotação
 *     (`:`, `(`, `-`, `!`) ou isolados como token — `TODO: validar`, `TODO(eduardo)`, `FIXME`;
 *   - `TBD` em maiúsculas;
 *   - as formas PT-BR de pendência, que não têm homônimo legítimo: `A DEFINIR`,
 *     `A SER DEFINIDO`, `PREENCHER`, `COMPLETAR AQUI`, `LOREM IPSUM`.
 * Case-insensitive só onde a expressão inteira é inequívoca; `todo`/`método` minúsculos
 * deixam de casar por construção.
 * ------------------------------------------------------------------------------------------
 */
const PLACEHOLDER_PATTERN = new RegExp(
  [
    // TODO:/TODO(/TODO -/TODO! — maiúsculas + marca de anotação
    String.raw`\b(?:TODO|FIXME|XXX|HACK)\s*(?::|\(|!|\s-\s)`,
    // TODO / FIXME / TBD isolados (token inteiro em maiúsculas)
    String.raw`(?:^|[\s"'\[(])(?:TODO|FIXME|TBD)(?=[\s"'\])。.,;]|$)`,
    // Pendência declarada em PT-BR — sem homônimo legítimo
    String.raw`\b(?:A\s+DEFINIR|A\s+SER\s+DEFINIDO|PREENCHER|COMPLETAR\s+AQUI|LOREM\s+IPSUM)\b`
  ].join('|')
);

/**
 * Separador entre a definição da coluna e a descrição, em compact-prose.
 * O format-reference documenta «—»; os exemplos canônicos usam «-». Ambos valem.
 */
const DESCRIPTION_SEPARATOR = /\s[—–]\s|\s-\s/;

/**
 * Tipos SQL aceitos em persistenceModel.entities[].columns (compact-prose).
 *
 * CORREÇÃO (v1.4) — a lista era Postgres-cêntrica e não incluía `NUMBER`, o tipo numérico
 * CANÔNICO do Oracle (`NUMBER`, `NUMBER(19)`, `NUMBER(15,2)`). Num backlog real sobre
 * data-model Oracle isso reprovou 65 de 132 segmentos de coluna perfeitamente corretos.
 * O tipo certo é o do banco do projeto: quem tem de ceder é o validador, nunca o artefato.
 * Acrescentados também `VARCHAR2`/`NVARCHAR2`, `RAW`, `LONG`, `NCLOB`, `BINARY_FLOAT`,
 * `BINARY_DOUBLE` e `INTERVAL` (Oracle) — mesma família de erro.
 */
const SQL_TYPE_PATTERN =
  /\b(BIGINT|INTEGER|INT|SMALLINT|TINYINT|SERIAL|BIGSERIAL|VARCHAR2|VARCHAR|NVARCHAR2|NVARCHAR|CHAR|TEXT|NCLOB|CLOB|TIMESTAMPTZ|TIMESTAMP|DATETIME|DATE|TIME|INTERVAL|BOOLEAN|BOOL|NUMERIC|NUMBER|DECIMAL|FLOAT|DOUBLE|REAL|MONEY|BINARY_FLOAT|BINARY_DOUBLE|UUID|JSONB|JSON|XML|BLOB|BYTEA|RAW|LONG|ENUM|ARRAY)\b(\s*\(\s*\d+(\s*,\s*\d+)?\s*\))?/;

/** Tipos de campo de UI que exigem lista de opções (a lacuna do caso real). */
const OPTION_BEARING_FIELD_TYPES = new Set([
  'select',
  'multiselect',
  'dropdown',
  'combo',
  'combobox',
  'radio',
  'radiogroup',
  'checkboxgroup',
  'autocomplete',
  'lookup'
]);

/** `task.type` que denota superfície de UI — exige uiContext + fields[] (FATAL). */
const UI_TASK_TYPES = new Set(['frontend', 'front-end', 'ui', 'web', 'mobile']);

/**
 * TASK_MISSING_API_CONTRACT / TASK_MISSING_PERSISTENCE_MODEL — gatilhos de NECESSIDADE.
 *
 * Por que existem (v1.4): `TASK_HAS_COMPLETE_API_SCHEMAS` e `TASK_HAS_COMPLETE_DATA_MODEL`
 * validam a QUALIDADE do campo PRESENTE e retornam em silêncio quando ele está ausente
 * (`if (all.length === 0) return`). Consequência medida em backlog real: 18 tasks citavam uma
 * rota literal sem `apiContracts`, 27 citavam uma tabela física sem `persistenceModel`, as 15
 * tasks `type:"frontend"` tinham ZERO contratos — e o validador saiu com exit 0 e nenhum FATAL.
 * Uma task que consome três endpoints e embute nenhum era indistinguível de uma que
 * legitimamente não tem API. Isto contraria a regra-título da skill: ninguém implementa
 * `POST /v1/contribuinte/buscar` sem o shape do request e da resposta.
 *
 * O gatilho é OBJETIVO, não julgamento: serializa-se a task inteira EXCETO o próprio bloco e
 * procura-se a citação. Se a task nomeia a rota/tabela em qualquer outro campo — summary,
 * regra, cenário, guidance, doNotDo — ela depende daquele contrato.
 */
const API_ROUTE_CITATION = /\/v\d+\/[a-z0-9\-\/{}]+/i;
const PHYSICAL_TABLE_CITATION = /\b(tb_|dm_|ft_|obt_)[a-z0-9_]+/i;

// <gatilhos-do-projeto>
// Bloco IDÊNTICO em validate-tasks-selfsufficiency.mjs e em lib/technical-contracts.mjs (lá com
// `export`): templates/validate-examples.mjs confere a igualdade, como confere os dois regexes acima.
/**
 * Gatilhos DERIVADOS DO PROJETO — complementam API_ROUTE_CITATION / PHYSICAL_TABLE_CITATION, que só
 * reconhecem o naming fixo (`/v1/…`, `tb_…`). Projeto com a versão em `servers[].url` e tabela sem
 * prefixo (`/pedidos`, `clientes`) deixava os dois gates de presença mudos (D29 do teste ponta a
 * ponta: nenhum FATAL, e o enriquecimento com `filledApi: 0`). Aqui a rota e a tabela são as que
 * EXISTEM no api-contracts.yaml e no data-model.json do projeto, e a citação só conta em contexto
 * inequívoco — nome de domínio em prosa («o vendedor lista os pedidos») e rota de TELA
 * (`uiContext.rota: "/pedidos/novo"`) não viram FATAL:
 *   rota   — precedida de verbo HTTP (`POST /pedidos/{id}/envio`), valor de `"path"` (testData,
 *            contrato) ou com prefixo de versão/base do servidor (`/v1/pedidos`); o parâmetro de
 *            path casa `{x}`, `:x`, `[x]` ou um valor concreto (`/pedidos/0b0b…/envio`);
 *   tabela — `tabela <nome>` / `table <nome>`, SQL (`FROM|JOIN|INTO|UPDATE <nome>`), coluna
 *            qualificada que existe no modelo (`pedidos.situacao`) ou, para nome com `_`/`.`
 *            (`itens_pedido`), o próprio nome.
 */
const PROJECT_ROUTE_VERBS = 'GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS';
const escapeProjectRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isProjectParamSegment = (s) => /^\{[^}]+\}$|^:[A-Za-z_]\w*$|^\[[^\]]+\]$/.test(String(s));

function projectRouteRegex(path, basePaths) {
  const segs = String(path ?? '').split('/').filter(Boolean);
  if (!segs.length) return null;
  const body = segs
    .map((s) => (isProjectParamSegment(s)
      ? String.raw`/(?:\{[^}/\s"]+\}|:[A-Za-z_]\w*|\[[^\]/\s"]+\]|[^/\s"'\x60?#{}[\]\\]+)`
      : `/${escapeProjectRe(s)}`))
    .join('');
  const bases = [String.raw`(?:/api)?/v\d+`, '/api', ...basePaths.filter((b) => b && b !== '/').map(escapeProjectRe)];
  const base = `(?:${bases.join('|')})`;
  const lead = String.raw`(?:\b(?:${PROJECT_ROUTE_VERBS})\s+${base}?|"path"\s*:\s*"${base}?|(?:(?<![\w.~/\\-])|(?<=\\[nrt]))${base})`;
  return new RegExp(lead + body + String.raw`(?![\w-]|\.\w|/[\w{:[])`, 'gi');
}

function projectTableRegexes(name, columns) {
  const n = escapeProjectRe(name);
  const out = [new RegExp(String.raw`\b(?:tabelas?|tables?|from|join|into|update)\s+\\?["'\x60«]?(?:\w+\.)?${n}(?![\w])`, 'gi')];
  const cols = columns.filter((c) => typeof c === 'string' && c.trim()).map((c) => escapeProjectRe(c.trim()));
  if (cols.length) out.push(new RegExp(String.raw`(?<![\w.])${n}\.(?:${cols.join('|')})(?![\w])`, 'gi'));
  if (/[_.]/.test(name)) out.push(new RegExp(String.raw`(?<![\w.])${n}(?![\w])`, 'gi'));
  return out;
}

/**
 * @param {{paths?:string[], basePaths?:string[], tables?:{name:string, columns?:string[]}[]}} fontes
 * @returns {{routes:{key:string, hint:string, re:RegExp}[], tables:{key:string, hint:string, re:RegExp}[]}}
 */
function buildProjectCitations({ paths = [], basePaths = [], tables = [] } = {}) {
  const routes = [];
  for (const p of paths) {
    const re = projectRouteRegex(p, basePaths);
    const literal = String(p).split('/').find((s) => s && !isProjectParamSegment(s));
    if (re) routes.push({ key: p, hint: literal ? `/${literal.toLowerCase()}` : '/', re });
  }
  const tbls = [];
  for (const t of tables) {
    if (typeof t?.name !== 'string' || !t.name.trim()) continue;
    const key = t.name.trim().toLowerCase();
    for (const name of new Set([key, key.split('.').pop()])) {
      for (const re of projectTableRegexes(name, Array.isArray(t.columns) ? t.columns : [])) tbls.push({ key, hint: name, re });
    }
  }
  return { routes, tables: tbls };
}

/** Citações de `kind` (`routes` | `tables`) no texto, na ordem dos gatilhos: `[{key, text}]`. */
function findProjectCitations(text, citations, kind) {
  const found = [];
  const lower = String(text ?? '').toLowerCase();
  for (const { key, hint, re } of citations?.[kind] ?? []) {
    if (!lower.includes(hint)) continue;
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      found.push({ key, text: m[0].replace(/^"path"\s*:\s*"/i, '') });
      if (!m[0]) re.lastIndex++;
    }
  }
  return found;
}

/** Segmentos da rota sem query, sem prefixo de versão/base (`/v1`, `/api`, o caminho do servidor). */
function projectRouteSegments(path, basePaths = []) {
  let segs = String(path ?? '').split(/[?#]/)[0].split('/').filter(Boolean);
  const bases = basePaths.map((b) => String(b).split('/').filter(Boolean)).filter((b) => b.length).sort((a, b) => b.length - a.length);
  const base = bases.find((b) => b.every((s, i) => String(segs[i] ?? '').toLowerCase() === s.toLowerCase()));
  if (base) segs = segs.slice(base.length);
  while (segs.length > 1 && /^(api|v\d+)$/i.test(segs[0])) segs = segs.slice(1);
  return segs;
}

/** Rota do contrato que corresponde a `path` (concreto ou template), a mais literal; `null` se nenhuma. */
function projectRouteFor(path, templates, basePaths = []) {
  const alvo = projectRouteSegments(path, basePaths);
  let best = null;
  let bestScore = -1;
  for (const tpl of templates) {
    const segs = projectRouteSegments(tpl, basePaths);
    if (segs.length !== alvo.length) continue;
    let score = 0;
    const ok = segs.every((s, i) => {
      if (s.toLowerCase() === alvo[i].toLowerCase()) { score++; return true; }
      return isProjectParamSegment(s) || isProjectParamSegment(alvo[i]);
    });
    if (ok && score > bestScore) { best = tpl; bestScore = score; }
  }
  return best;
}
// </gatilhos-do-projeto>

/**
 * Contrato e modelo do PROJETO, lidos de onde o enrich-tasks.mjs os lê: `--sources <dir>`, a pasta
 * do tasks.json e a pai. Leitura mínima e própria — este validador não importa a lib, para que um
 * erro nela nunca derrube o gate: do api-contracts.yaml, as rotas de `paths:`, os métodos, se cada
 * operação declara `requestBody` e o caminho de `servers[].url`; do data-model.json, tabela e
 * colunas. Fonte ilegível é fonte ausente: o gate volta ao naming fixo, nunca adivinha.
 * `PIPELINE_OUTPUTS_DIR` não é consultado de propósito: validar um arquivo fora do projeto (os
 * fixtures do kit) não pode herdar o contrato do projeto aberto no terminal.
 */
const API_DOC_NAMES = ['api-contracts.yaml', 'api-contracts.yml', 'api-contracts_change.yaml', 'api-contracts_change.yml'];
const DATA_MODEL_NAMES = ['data-model.json', 'data-model_change.json'];

function readOpenApiSkeleton(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const indent = (l) => l.length - l.trimStart().length;
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, '');
  const paths = [];
  const ops = [];
  const basePaths = [];
  let section = null;
  let pathIndent = -1;
  let methodIndent = -1;
  let childIndent = -1;
  let curPath = null;
  let curOp = null;
  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const ind = indent(line);
    if (ind === 0) {
      section = /^([\w-]+)\s*:/.exec(line)?.[1] ?? null;
      pathIndent = methodIndent = childIndent = -1;
      curPath = curOp = null;
      continue;
    }
    if (section === 'servers') {
      const m = /^\s*-?\s*url\s*:\s*(.+)$/.exec(line);
      if (m) {
        const url = unquote(m[1]);
        const p = (/^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/[^?#]*)?/i.exec(url)?.[1] ?? (url.startsWith('/') ? url : '')).replace(/\/+$/, '');
        if (p) basePaths.push(p);
      }
      continue;
    }
    if (section !== 'paths') continue;
    if (pathIndent < 0) pathIndent = ind;
    if (ind <= pathIndent) {
      curPath = /^\s*["']?(\/[^"':]*?)["']?\s*:\s*$/.exec(line)?.[1] ?? null;
      if (curPath) paths.push(curPath);
      methodIndent = -1;
      curOp = null;
      continue;
    }
    if (!curPath) continue;
    if (methodIndent < 0) methodIndent = ind;
    if (ind <= methodIndent) {
      const m = /^\s*(get|post|put|patch|delete|head|options)\s*:\s*$/i.exec(line);
      curOp = m ? { method: m[1].toUpperCase(), path: curPath, hasRequestBody: false } : null;
      if (curOp) ops.push(curOp);
      childIndent = -1;
      continue;
    }
    if (!curOp) continue;
    if (childIndent < 0) childIndent = ind;
    if (ind === childIndent && /^\s*requestBody\s*:/.test(line)) curOp.hasRequestBody = true;
  }
  return { paths, ops, basePaths: [...new Set(basePaths)] };
}

function readDataModelTables(json) {
  const contexts = arr(json?.boundedContexts);
  const flat = contexts.length ? contexts : [{ entities: arr(json?.entities) }];
  const out = [];
  for (const bc of flat) {
    for (const e of arr(bc?.entities)) {
      const name = e?.tableName ?? e?.table ?? e?.name;
      if (isNonEmptyString(name)) out.push({ name, columns: arr(e?.columns).map((c) => c?.name).filter(isNonEmptyString) });
    }
  }
  return out;
}

function loadProjectSources(dirs) {
  const out = { apiContracts: null, dataModel: null, paths: [], basePaths: [], ops: [], tables: [] };
  for (const dir of dirs) {
    if (!out.apiContracts) {
      const p = API_DOC_NAMES.map((n) => join(dir, n)).find((x) => existsSync(x));
      if (p) {
        try {
          Object.assign(out, readOpenApiSkeleton(readFileSync(p, 'utf8')));
          out.apiContracts = p;
        } catch { /* fonte ilegível é fonte ausente */ }
      }
    }
    if (!out.dataModel) {
      const p = DATA_MODEL_NAMES.map((n) => join(dir, n)).find((x) => existsSync(x));
      if (p) {
        try {
          out.tables = readDataModelTables(JSON.parse(readFileSync(p, 'utf8')));
          out.dataModel = p;
        } catch { /* idem */ }
      }
    }
  }
  return out;
}

/**
 * `task.type` que produz CÓDIGO (e portanto pode ter contrato a embutir). Usado só no ramo
 * WARNING: sinal fraco = a story-pai declara endpoint/tabela, a task é de código, mas a task
 * não cita a rota/tabela literalmente. Nesse caso não há prova de dependência — há indício.
 */
const CODE_BEARING_TASK_TYPES = new Set([
  'frontend', 'front-end', 'ui', 'web', 'mobile',
  'backend', 'back-end', 'api', 'service',
  'fullstack', 'full-stack',
  'database', 'data', 'etl', 'integration', 'infra'
]);

/** Sinais textuais de que a task toca UI, usados só para WARNING (nunca FATAL). */
const UI_TEXT_SIGNAL =
  /\b(tela|telas|formul[áa]rio|filtro|filtros|dropdown|combo|select|grid|listagem|modal|p[áa]gina|componente de UI|front-?end)\b/i;

// ---------------------------------------------------------------------------
// Infra
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let reportMode = false;
let writeMode = false;
let maxItems = 200;
let sourcesArg = null;
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--report') reportMode = true;
  else if (a === '--write') writeMode = true;
  else if (a === '--sources') sourcesArg = argv[++i] ?? null;
  else if (a.startsWith('--sources=')) sourcesArg = a.slice('--sources='.length);
  else if (a === '--max') maxItems = Number.parseInt(argv[++i] ?? '200', 10);
  else if (a.startsWith('--max=')) maxItems = Number.parseInt(a.slice('--max='.length), 10);
  else positional.push(a);
}

const inputPath = resolve(positional[0] ?? 'outputs/spec/tasks.json');

/** @type {{code:string, scope:string, field:string, message:string, suggestedFix:string}[]} */
const errors = [];
/** @type {{code:string, scope:string, field:string, message:string, suggestedFix:string}[]} */
const warnings = [];

function fail(code, scope, field, message, suggestedFix) {
  errors.push({ code, scope, field, message, suggestedFix });
}
function warn(code, scope, field, message, suggestedFix) {
  warnings.push({ code, scope, field, message, suggestedFix });
}

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';
const arr = (v) => (Array.isArray(v) ? v : []);
const len = (v) => (typeof v === 'string' ? v.trim().length : 0);

/** Segmentos de uma string compact-prose pipe-separated. */
function segments(s) {
  return typeof s === 'string' ? s.split('|').map((x) => x.trim()).filter(Boolean) : [];
}

function resolveTaskClass(task) {
  const explicit = String(task?.class ?? '').toLowerCase();
  if (explicit) return explicit;
  if (task?.generatedBy === 'spec-security-review') return 'security';
  if (task?.generatedBy === 'spec-test-plan') return 'uat';
  if (String(task?.testType ?? '').toUpperCase() === 'UAT') return 'uat';
  // Spike sem `class` declarada: reconhecido por `spike{}`, por type/adoWorkItemType ou por
  // título. Sem esta deteção, os 2 spikes do artefato real (id + adoWorkItemType + type +
  // title, nada mais) eram tratados como `functional` e recebiam uma cascata de FATAL de
  // contrato técnico que não se aplica — ruído que enterra o defeito verdadeiro (spike sem
  // pergunta, sem timebox e sem critério de saída).
  if (isObj(task?.spike)) return 'spike';
  if (/\bspike\b/i.test(String(task?.type ?? '')) || /\bspike\b/i.test(String(task?.adoWorkItemType ?? ''))) return 'spike';
  if (/^\s*(\[?spike\]?\b|spike\s*[:—-])/i.test(String(task?.title ?? ''))) return 'spike';
  if (/^SPIKE[-_]/i.test(String(task?.id ?? ''))) return 'spike';
  return 'functional';
}

// ---------------------------------------------------------------------------
// 1. TASK_HAS_FULL_SUMMARY
// ---------------------------------------------------------------------------

function checkFullSummary(scope, task, exemptTechnical, klass) {
  // uat e spike têm gate PRÓPRIO (UAT_TASK_HAS_SUMMARY / SPIKE_TASK_COMPLETE). Reportar aqui
  // também faria o mesmo defeito sair sob dois códigos e inflar errorsByCode.
  if (klass === 'uat' || klass === 'spike') return;
  const ctx = task.agentExecutionContext;
  if (!isObj(ctx) || !isNonEmptyString(ctx.selfContainedSummary)) {
    fail(
      'TASK_HAS_FULL_SUMMARY',
      scope,
      'agentExecutionContext.selfContainedSummary',
      'campo ausente ou vazio',
      'Transcrever para o campo: descrição funcional, contexto de negócio, atores, fluxo principal passo-a-passo, pré/pós-condições e decisões arquiteturais relevantes.'
    );
    return;
  }
  if (exemptTechnical) return;
  const n = len(ctx.selfContainedSummary);
  if (n < MIN_SUMMARY_CHARS) {
    fail(
      'TASK_HAS_FULL_SUMMARY',
      scope,
      'agentExecutionContext.selfContainedSummary',
      `${n} caracteres — mínimo ${MIN_SUMMARY_CHARS}`,
      'O summary está resumindo em vez de transcrever. Copiar o conteúdo do RF e das RN aplicáveis para dentro do campo.'
    );
  }
}

// ---------------------------------------------------------------------------
// 2. TASK_HAS_COMPLETE_API_SCHEMAS
// ---------------------------------------------------------------------------

function checkApiSchemas(scope, task) {
  const contracts = arr(task.apiContracts);
  const single = isObj(task.apiContract) ? [task.apiContract] : [];
  const all = [...contracts, ...single];
  if (all.length === 0) return; // task sem superfície de API — validator não se aplica

  all.forEach((c, i) => {
    const field = `apiContracts[${i}]`;
    const id = isNonEmptyString(c?.operationId) ? c.operationId : `${c?.method ?? '?'} ${c?.path ?? '?'}`;

    if (!isNonEmptyString(c?.auth)) {
      fail('TASK_HAS_COMPLETE_API_SCHEMAS', scope, `${field}.auth`,
        `operação ${id}: auth vazio`,
        'Preencher a string rica de auth (ex.: "Bearer JWT — roles: X, Y. Claims: sub (id)") ou "Público — endpoint sem autenticação".');
    }

    const request = typeof c?.request === 'string' ? c.request : '';
    const hasCoreComponent = /\b(Body|Path|Query)\s*:/i.test(request);
    const hasHeadersOnly = !hasCoreComponent && /\bHeaders\s*:/i.test(request);
    if (!hasCoreComponent && !hasHeadersOnly) {
      fail('TASK_HAS_COMPLETE_API_SCHEMAS', scope, `${field}.request`,
        `operação ${id}: request sem nenhum componente Body:/Path:/Query:/Headers:`,
        'Converter o requestBody/parameters do api-contracts.yaml para a string rica pipe-separated (ver tasks.format-reference.md § request).');
    } else if (hasHeadersOnly) {
      // Desvio documentado da especificação da SKILL (que exige Body/Path/Query):
      // um GET sem parâmetros pode legitimamente ter só Headers. WARNING, não FATAL.
      warn('TASK_HAS_COMPLETE_API_SCHEMAS', scope, `${field}.request`,
        `operação ${id}: request só tem Headers: — confirmar que a operação realmente não tem Path/Query/Body`,
        'Se houver parâmetros de path/query, declarar. Se não houver, ignorar este aviso.');
    }

    const responses = typeof c?.responses === 'string' ? c.responses : '';
    const codes = segments(responses)
      .map((seg) => /^(\d{3})\b/.exec(seg)?.[1])
      .filter(Boolean);
    const has2xx = codes.some((s) => s.startsWith('2'));
    const has4xx = codes.some((s) => s.startsWith('4'));
    const has5xx = codes.some((s) => s.startsWith('5'));
    if (!has2xx || !has4xx) {
      const missing = [!has2xx && '2xx', !has4xx && '4xx'].filter(Boolean).join(', ');
      fail('TASK_HAS_COMPLETE_API_SCHEMAS', scope, `${field}.responses`,
        `operação ${id}: faltam classes de status ${missing} (encontradas: ${codes.join(', ') || 'nenhuma'})`,
        'Cada operação precisa de ao menos um 2xx e um 4xx, com schema do body (e o 5xx que o contrato declarar). Ver tasks.format-reference.md § responses.');
    }
    // 5xx ausente é AVISO (D30 do teste ponta a ponta): a spec-api-contracts, dona do contrato, não
    // manda declarar 5xx por operação — o próprio stub dela não tem nenhum; o erro de servidor é
    // genérico e segue o catálogo RFC 7807 e as rules de tratamento de erro. Exigir aqui obrigava a
    // inventar contrato (ou deixava toda operação do projeto em lacuna permanente).
    if (!has5xx) {
      warn('TASK_HAS_COMPLETE_API_SCHEMAS', scope, `${field}.responses`,
        `operação ${id}: nenhum 5xx declarado (encontradas: ${codes.join(', ') || 'nenhuma'})`,
        'Transcrever o 5xx quando o api-contracts.yaml o declara. Se o contrato não declara, o tratamento de erro de servidor vem das rules do projeto — ignorar este aviso.');
    }
  });
}

// ---------------------------------------------------------------------------
// 3. TASK_HAS_COMPLETE_DATA_MODEL
// ---------------------------------------------------------------------------

function checkDataModel(scope, task) {
  const pm = task.persistenceModel;
  if (!isObj(pm)) return; // task sem persistência — validator não se aplica
  const entities = arr(pm.entities);
  if (entities.length === 0) {
    fail('TASK_HAS_COMPLETE_DATA_MODEL', scope, 'persistenceModel.entities',
      'persistenceModel presente mas entities[] vazio',
      'Embutir as entidades do data-model.json, ou remover persistenceModel se a task não toca dados.');
    return;
  }

  entities.forEach((e, i) => {
    const field = `persistenceModel.entities[${i}]`;
    // `table` é required no schema v5.3. Renderers que leem `name` produzem saída vazia.
    if (!isNonEmptyString(e?.table)) {
      fail('TASK_HAS_COMPLETE_DATA_MODEL', scope, `${field}.table`,
        'entidade sem `table` (nome da tabela)',
        'O schema v5.3 exige `table`. Não usar `name` — renderers do pipeline leem `table`.');
    }
    const cols = typeof e?.columns === 'string' ? e.columns : '';
    const segs = segments(cols);
    if (segs.length === 0) {
      fail('TASK_HAS_COMPLETE_DATA_MODEL', scope, `${field}.columns`,
        `entidade ${e?.table ?? i}: columns vazio`,
        'Converter TODAS as colunas do data-model.json para a string rica pipe-separated (ver tasks.format-reference.md § columns).');
      return;
    }
    const qualified = segs.filter((s) => {
      const hasType = SQL_TYPE_PATTERN.test(s);
      // O format-reference especifica «—», mas os exemplos canônicos usam «-». Aceitar
      // travessão, meia-risca ou hífen cercado de espaços: reprovar por separador
      // cosmético geraria FATAL falso e desacreditaria o gate.
      const m = DESCRIPTION_SEPARATOR.exec(s);
      const hasDescription = !!m && s.slice(m.index + m[0].length).trim().length >= 3;
      return hasType && hasDescription;
    });
    if (qualified.length === 0) {
      fail('TASK_HAS_COMPLETE_DATA_MODEL', scope, `${field}.columns`,
        `entidade ${e?.table ?? i}: nenhum dos ${segs.length} segmento(s) tem TIPO SQL + descrição após o separador`,
        'Formato por coluna: "nome TIPO constraints [operationType] — descrição". Ex.: "status VARCHAR(40) NOT NULL [NEW] — Status do pedido. Valores: PENDENTE, PAGO."');
    } else if (qualified.length < segs.length) {
      warn('TASK_HAS_COMPLETE_DATA_MODEL', scope, `${field}.columns`,
        `entidade ${e?.table ?? i}: ${segs.length - qualified.length} de ${segs.length} coluna(s) sem TIPO ou sem descrição`,
        'Completar tipo e descrição de cada coluna.');
    }
  });
}

// ---------------------------------------------------------------------------
// 3b. TASK_MISSING_API_CONTRACT / TASK_MISSING_PERSISTENCE_MODEL
//     (gates de PRESENÇA — complementam os de QUALIDADE acima, não os substituem)
//
// Severidade espelhada em TASK_UI_HAS_FIELD_CONTRACT:
//   FATAL   — citação EXPLÍCITA (rota literal `/v1/...` ou tabela física `tb_`/`dm_`/`ft_`/
//             `obt_`; ou rota/tabela que existe no contrato e no modelo do PROJETO, citada em
//             contexto inequívoco — ver «gatilhos-do-projeto») no corpo da task e o bloco
//             correspondente ausente ou vazio. Aqui a informação é comprovadamente
//             insubstituível: a task nomeia o que consome.
//   WARNING — sinal FRACO: task de código cujo PAI (story) declara a rota/tabela, mas a
//             própria task não a cita. Indício de lacuna, não prova.
// Isenções: `class=uat` e `class=spike`, exatamente como os demais gates de contrato técnico
// (CLASS_EXEMPT_TECHNICAL) — a task UAT não implementa e o spike entrega uma DECISÃO.
// ---------------------------------------------------------------------------

/**
 * Serializa `node` em texto omitindo as chaves de `omitKeys` em QUALQUER profundidade.
 * Necessário para que a própria presença do contrato não sirva de gatilho: se a rota só
 * aparece dentro de `apiContracts[]`, a task JÁ embutiu o contrato — não há defeito.
 */
function serializeExcept(node, omitKeys) {
  const omit = new Set(omitKeys);
  const seen = new WeakSet();
  try {
    return (
      JSON.stringify(node, (key, value) => {
        if (omit.has(key)) return undefined;
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return undefined; // defensivo: ciclo não derruba o validador
          seen.add(value);
        }
        return value;
      }) ?? ''
    );
  } catch {
    return '';
  }
}

/**
 * Primeira rota citada: o naming fixo (`/vN/…`) ou uma rota do contrato do projeto (gatilhos do
 * projeto, acima). `{route, context}` — `context` diz como apareceu no texto, quando difere.
 */
function citedRoute(text) {
  const fixed = API_ROUTE_CITATION.exec(text);
  if (fixed) return { route: fixed[0], context: null };
  const hit = findProjectCitations(text, PROJECT_CITATIONS, 'routes')[0];
  return hit ? { route: hit.key, context: `citada como «${hit.text.trim()}»; operação do contrato do projeto` } : null;
}

/** Primeira tabela citada: o naming fixo (`tb_…`) ou uma tabela do modelo do projeto. */
function citedTable(text) {
  const fixed = PHYSICAL_TABLE_CITATION.exec(text);
  if (fixed) return { table: fixed[0], context: null };
  const hit = findProjectCitations(text, PROJECT_CITATIONS, 'tables')[0];
  return hit ? { table: hit.key, context: `citada como «${hit.text.trim()}»; tabela do modelo do projeto` } : null;
}

function checkContractPresence(scope, task, exemptTechnical, parentStory) {
  if (exemptTechnical) return;

  const hasApi = arr(task.apiContracts).length > 0 || isObj(task.apiContract);
  const pm = task.persistenceModel;
  const pmEntities = isObj(pm) ? arr(pm.entities) : [];
  const hasPersistence = pmEntities.length > 0;

  // `persistenceModel` presente com `entities[]` vazio já é FATAL em
  // TASK_HAS_COMPLETE_DATA_MODEL. Reportar aqui também faria o MESMO defeito sair sob dois
  // códigos e inflar errorsByCode — o arquivo já evita isso em checkFullSummary.
  const emptyPmAlreadyReported = isObj(pm) && pmEntities.length === 0;

  const taskType = String(task.type ?? '').toLowerCase().trim();
  const isCodeBearing = CODE_BEARING_TASK_TYPES.has(taskType);

  // Task SEC (injetada pela spec-security-review a partir do kernel) não tem como embutir o
  // contrato: o inject-sec copia o controle, não a operação, e roda este validador antes de
  // gravar. Citação vinda dos gatilhos do PROJETO vira WARNING nela — antes deles essa citação
  // nem disparava, e FATAL faria o inject-sec recusar a injeção. O naming fixo (`/vN/…`, `tb_…`)
  // continua FATAL para todas, como sempre foi.
  const report = (context) => (context && resolveTaskClass(task) === 'security' ? warn : fail);

  // --- API ------------------------------------------------------------------
  if (!hasApi) {
    const body = serializeExcept(task, ['apiContracts', 'apiContract']);
    const cited = citedRoute(body);
    if (cited) {
      const { route, context } = cited;
      report(context)('TASK_MISSING_API_CONTRACT', scope, 'apiContracts',
        `a task cita a rota «${route}»${context ? ` (${context})` : ''} e não tem apiContracts[] — quem implementa não recebe o shape do request nem das respostas`,
        `Embutir a operação «${route}» do api-contracts.yaml em apiContracts[], em compact-prose v5.3: operationId, method, path, signature, summary, description, auth, request (Body:/Path:/Query:/Headers:), responses (ao menos um 2xx e um 4xx, e o 5xx que o contrato declarar) e policies. Vale também para task de frontend: quem CONSOME o endpoint precisa do contrato.`);
    } else if (isCodeBearing && parentStory) {
      const storyBody = serializeExcept(parentStory, ['tasks']);
      const storyCited = citedRoute(storyBody);
      if (storyCited) {
        warn('TASK_MISSING_API_CONTRACT', scope, 'apiContracts',
          `task type="${taskType}" sem apiContracts[]; a story-pai declara a rota «${storyCited.route}» e a task não cita rota literal`,
          'Confirmar se esta task consome algum endpoint da story. Se consome, embutir o contrato completo em apiContracts[]. Se é a fatia que legitimamente não toca API (ex.: componente puro de UI, script de build), ignorar este aviso.');
      }
    }
  }

  // --- Persistência ---------------------------------------------------------
  if (!hasPersistence && !emptyPmAlreadyReported) {
    const body = serializeExcept(task, ['persistenceModel']);
    const cited = citedTable(body);
    if (cited) {
      const { table, context } = cited;
      report(context)('TASK_MISSING_PERSISTENCE_MODEL', scope, 'persistenceModel.entities',
        `a task cita a tabela física «${table}»${context ? ` (${context})` : ''} e não tem persistenceModel.entities[] — quem implementa não recebe colunas, tipos, chaves nem índices`,
        `Embutir a entidade «${table}» do data-model.json em persistenceModel.entities[], completa: table, purpose, boundedContext, operationType, identifierStrategy, primaryKey, columns (nome TIPO constraints [operationType] — descrição, TODAS as colunas), relationships, indexes, uniqueConstraints, checkConstraints, migrationNotes e dataModelRef. Vale também para task de frontend que só EXIBE o dado.`);
    } else if (isCodeBearing && parentStory) {
      const storyBody = serializeExcept(parentStory, ['tasks']);
      const storyCited = citedTable(storyBody);
      if (storyCited) {
        warn('TASK_MISSING_PERSISTENCE_MODEL', scope, 'persistenceModel.entities',
          `task type="${taskType}" sem persistenceModel; a story-pai declara a tabela «${storyCited.table}» e a task não cita tabela literal`,
          'Confirmar se esta task lê ou escreve na tabela da story. Se lê ou escreve, embutir a entidade completa em persistenceModel.entities[]. Se não toca dados, ignorar este aviso.');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. TASK_HAS_EXPANDED_BUSINESS_RULES
// ---------------------------------------------------------------------------

function checkExpandedBusinessRules(scope, task) {
  const rules = arr(task.businessRules);
  if (rules.length === 0) return; // sem regras declaradas na task

  rules.forEach((r, i) => {
    const field = `businessRules[${i}]`;
    if (typeof r === 'string') {
      fail('TASK_HAS_EXPANDED_BUSINESS_RULES', scope, field,
        `regra em formato string ("${r.slice(0, 60)}")`,
        'Expandir para objeto: {id, title, description, rationale, implementation:{validationPoint, algorithm[], errorMessages{}}, testScenarios[]}.');
      return;
    }
    if (!isObj(r)) {
      fail('TASK_HAS_EXPANDED_BUSINESS_RULES', scope, field, 'regra não é objeto', 'Ver shape em tasks.example-completo.json → businessRules[].');
      return;
    }
    const rid = isNonEmptyString(r.id) ? r.id : `#${i}`;
    if (!isNonEmptyString(r.id)) {
      fail('TASK_HAS_EXPANDED_BUSINESS_RULES', scope, `${field}.id`, 'regra sem id', 'Usar o ID do business-rules.md (RN-xxx / RN-NOVO-xxx).');
    }
    if (!isNonEmptyString(r.title)) {
      fail('TASK_HAS_EXPANDED_BUSINESS_RULES', scope, `${field}.title`, `regra ${rid} sem title`, 'Título curto da obrigação.');
    }
    const dlen = len(r.description);
    if (dlen < MIN_TASK_RULE_DESCRIPTION) {
      fail('TASK_HAS_EXPANDED_BUSINESS_RULES', scope, `${field}.description`,
        `regra ${rid}: description com ${dlen} caracteres — mínimo ${MIN_TASK_RULE_DESCRIPTION}`,
        'Transcrever a regra completa do business-rules.md, incluindo condições, exceções e base legal — não resumir.');
    }
    const impl = r.implementation;
    if (!isObj(impl)) {
      fail('TASK_HAS_EXPANDED_BUSINESS_RULES', scope, `${field}.implementation`,
        `regra ${rid}: implementation ausente`,
        'Adicionar {validationPoint, algorithm[], errorMessages{}}.');
    } else {
      if (arr(impl.algorithm).length === 0) {
        fail('TASK_HAS_EXPANDED_BUSINESS_RULES', scope, `${field}.implementation.algorithm`,
          `regra ${rid}: algorithm[] vazio`,
          'Detalhar a validação passo-a-passo, um passo por item.');
      }
      if (!isObj(impl.errorMessages) || Object.keys(impl.errorMessages).length === 0) {
        fail('TASK_HAS_EXPANDED_BUSINESS_RULES', scope, `${field}.implementation.errorMessages`,
          `regra ${rid}: errorMessages{} vazio`,
          'Uma chave UPPERCASE por cenário de falha, com a mensagem exibida ao usuário.');
      }
    }
    if (arr(r.testScenarios).length === 0) {
      fail('TASK_HAS_EXPANDED_BUSINESS_RULES', scope, `${field}.testScenarios`,
        `regra ${rid}: testScenarios[] vazio`,
        'Ao menos 1 happy path e 1 violação da regra.');
    }
  });
}

// ---------------------------------------------------------------------------
// 5. TASK_HAS_CONCRETE_TEST_DATA
// ---------------------------------------------------------------------------

const BODYLESS_METHODS = new Set(['GET', 'HEAD', 'DELETE', 'OPTIONS']);

/** O `request` compact-prose declara corpo? `Body: nenhum` / `Body: —` conta como sem corpo. */
function contractDeclaresBody(c) {
  if (typeof c?.request === 'string') {
    const m = /\bBody\s*:\s*([^|]*)/i.exec(c.request);
    return !!m && !/^\(?\s*(nenhum|sem corpo|vazio|n\/a|—|-)?\s*\)?\.?$/i.test(m[1].trim());
  }
  if (isObj(c?.request)) return c.request.body !== undefined || c.request.requestBody !== undefined;
  return c?.requestBody !== undefined;
}

/**
 * A operação do cenário tem corpo? (D31 do teste ponta a ponta) — quem decide é o contrato:
 * primeiro o `apiContracts[]` da própria task (`Body:` no `request`), depois o api-contracts.yaml do
 * projeto (`requestBody`). Endpoint de transição de estado (`POST /pedidos/{id}/envio`) não tem
 * corpo, e exigir um obrigava o autor a escrever «(sem corpo)» no `body` para passar.
 * `null` = nenhum contrato para o par método + rota: vale a regra antiga, por verbo.
 */
function scenarioOperationHasBody(task, method, path) {
  const own = [...arr(task.apiContracts), ...(isObj(task.apiContract) ? [task.apiContract] : [])]
    .filter((c) => String(c?.method ?? '').toUpperCase() === method && isNonEmptyString(c?.path));
  const ownTpl = projectRouteFor(path, own.map((c) => c.path), PROJECT.basePaths);
  if (ownTpl) return own.filter((c) => c.path === ownTpl).some(contractDeclaresBody);
  const ops = PROJECT.ops.filter((o) => o.method === method);
  const tpl = projectRouteFor(path, ops.map((o) => o.path), PROJECT.basePaths);
  return tpl ? ops.some((o) => o.path === tpl && o.hasRequestBody) : null;
}

function checkConcreteTestData(scope, task, exemptTechnical, klass) {
  if (exemptTechnical) return;
  const scenarios = arr(task.acceptanceScenarios);
  if (scenarios.length === 0) {
    // CORREÇÃO (v1.3) — omissão deixa de ser mais barata que preenchimento.
    // Antes: cenário AUSENTE → WARNING; cenário PRESENTE e incompleto → FATAL. Resultado
    // perverso: o requisito central ("nunca só caminho feliz") não tinha gate bloqueante em
    // nenhum dos dois scripts, embora a tabela da SKILL declarasse o validator como FATAL.
    // Agora, para task `functional` (o default), ausência é tão grave quanto preenchimento
    // incompleto. `class=uat` continua isenta (a fonte é o test-plan.md); `class=security`
    // fica em WARNING porque o shape SEC ancora a verificação em security{} +
    // acceptanceCriteria — isto está documentado na tabela de classes do SKILL.md.
    const msg = 'task sem acceptanceScenarios[] — sem cenários não há como provar "nunca só caminho feliz"';
    const fix = 'Derivar do test-plan.md (rastreando TC-NNN em coverageNote) ou da matriz mínima RF+RN (SKILL § "acceptanceScenarios[]"): ≥1 HAPPY_PATH + ≥1 INVALID_INPUT + ≥1 BUSINESS_RULE_VIOLATION, cada um com testData concreto (request, expectedResponse, expectedDatabaseState).';
    if (klass === 'security') warn('TASK_HAS_CONCRETE_TEST_DATA', scope, 'acceptanceScenarios', msg, fix);
    else fail('TASK_HAS_CONCRETE_TEST_DATA', scope, 'acceptanceScenarios', msg, fix);
    return;
  }

  scenarios.forEach((s, i) => {
    const field = `acceptanceScenarios[${i}]`;
    const sid = isNonEmptyString(s?.id) ? s.id : `#${i}`;
    const td = s?.testData;
    if (!isObj(td)) {
      fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData`,
        `cenário ${sid}: testData ausente`,
        'Adicionar request (method, path, headers, body), expectedResponse (statusCode, body) e expectedDatabaseState.');
      return;
    }

    const req = td.request;
    if (!isObj(req)) {
      fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData.request`,
        `cenário ${sid}: request ausente`,
        'Payload COMPLETO e concreto — nunca placeholders.');
    } else {
      const method = String(req.method ?? '').toUpperCase();
      if (!method) {
        fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData.request.method`, `cenário ${sid}: method ausente`, 'Declarar o verbo HTTP.');
      }
      if (!isNonEmptyString(req.path)) {
        fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData.request.path`, `cenário ${sid}: path ausente`, 'Declarar o path concreto, com IDs reais.');
      }
      const hasHeaders = isObj(req.headers) ? Object.keys(req.headers).length > 0 : isNonEmptyString(req.headers);
      if (!hasHeaders) {
        fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData.request.headers`, `cenário ${sid}: headers ausente`, 'Incluir Authorization e correlação quando aplicável.');
      }
      const hasBody = isObj(req.body)
        ? Object.keys(req.body).length > 0
        : (Array.isArray(req.body) ? req.body.length > 0 : isNonEmptyString(req.body));
      // Corpo vazio DECLARADO (`"body": {}`) num cenário de entrada inválida é o dado do teste —
      // «enviar sem corpo e receber 400» —, não ausência de dado.
      const declaredEmpty = Object.prototype.hasOwnProperty.call(req, 'body')
        && String(s?.category ?? '').toUpperCase() === 'INVALID_INPUT';
      if (!hasBody && !declaredEmpty) {
        // O contrato da operação decide; sem contrato, o desvio documentado por verbo:
        // GET/HEAD/DELETE/OPTIONS legitimamente não têm body.
        const fromContract = method ? scenarioOperationHasBody(task, method, req.path) : null;
        if (fromContract ?? !BODYLESS_METHODS.has(method)) {
          fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData.request.body`,
            `cenário ${sid}: body ausente em ${method}${fromContract ? ' — a operação do contrato declara corpo' : ''}`,
            'Preencher com o payload completo do cenário, não com placeholders. Corpo vazio de propósito (entrada inválida) se declara `"body": {}` num cenário INVALID_INPUT.');
        }
      }
    }

    const resp = td.expectedResponse;
    if (!isObj(resp)) {
      fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData.expectedResponse`,
        `cenário ${sid}: expectedResponse ausente`,
        'Declarar statusCode e a estrutura COMPLETA do body esperado.');
    } else {
      if (resp.statusCode === undefined || resp.statusCode === null || String(resp.statusCode).trim() === '') {
        fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData.expectedResponse.statusCode`, `cenário ${sid}: statusCode ausente`, 'Ex.: 201, 422.');
      }
      const hasRespBody = isObj(resp.body)
        ? Object.keys(resp.body).length > 0
        : (Array.isArray(resp.body) ? resp.body.length > 0 : isNonEmptyString(resp.body));
      if (!hasRespBody) {
        fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData.expectedResponse.body`, `cenário ${sid}: body esperado ausente`, 'Estrutura completa, não "retorna 201".');
      }
    }

    const dbState = td.expectedDatabaseState;
    const hasDbState = isObj(dbState)
      ? Object.keys(dbState).length > 0
      : (Array.isArray(dbState) ? dbState.length > 0 : isNonEmptyString(dbState));
    if (!hasDbState) {
      fail('TASK_HAS_CONCRETE_TEST_DATA', scope, `${field}.testData.expectedDatabaseState`,
        `cenário ${sid}: expectedDatabaseState ausente`,
        'Estado esperado de TODAS as tabelas afetadas. Para cenário sem escrita, declarar explicitamente "inalterado".');
    }
  });
}

// ---------------------------------------------------------------------------
// 6. TASK_HAS_IMPLEMENTATION_GUIDANCE
// ---------------------------------------------------------------------------

function checkImplementationGuidance(scope, task, exemptTechnical) {
  if (exemptTechnical) return;
  const g = task.implementationGuidance;
  if (!isObj(g)) {
    fail('TASK_HAS_IMPLEMENTATION_GUIDANCE', scope, 'implementationGuidance',
      'campo ausente',
      'Adicionar architecturalDecisions[], dataFlow[], errorHandling{}, observability{}, testingStrategy{}.');
    return;
  }
  const decisions = arr(g.architecturalDecisions);
  if (decisions.length < MIN_ARCH_DECISIONS) {
    fail('TASK_HAS_IMPLEMENTATION_GUIDANCE', scope, 'implementationGuidance.architecturalDecisions',
      `${decisions.length} item(ns) — mínimo ${MIN_ARCH_DECISIONS}`,
      'Extrair padrões, bibliotecas e trade-offs das rules do projeto.');
  }
  const flow = arr(g.dataFlow);
  if (flow.length < MIN_DATA_FLOW_STEPS) {
    fail('TASK_HAS_IMPLEMENTATION_GUIDANCE', scope, 'implementationGuidance.dataFlow',
      `${flow.length} passo(s) — mínimo ${MIN_DATA_FLOW_STEPS}`,
      'Detalhar camada por camada, da entrada à persistência e à resposta.');
  }
  const eh = g.errorHandling;
  const ehCount = isObj(eh) ? Object.keys(eh).length : arr(eh).length;
  if (ehCount < MIN_ERROR_SCENARIOS) {
    fail('TASK_HAS_IMPLEMENTATION_GUIDANCE', scope, 'implementationGuidance.errorHandling',
      `${ehCount} cenário(s) — mínimo ${MIN_ERROR_SCENARIOS}`,
      'Cada cenário com scenario/action/userImpact. Em task de UI, cobrir os estados de erro da tela.');
  }
  const obs = g.observability;
  if (!isObj(obs)) {
    fail('TASK_HAS_IMPLEMENTATION_GUIDANCE', scope, 'implementationGuidance.observability', 'ausente', 'Adicionar structuredLogging[] e metrics[].');
  } else {
    if (arr(obs.structuredLogging).length === 0) {
      fail('TASK_HAS_IMPLEMENTATION_GUIDANCE', scope, 'implementationGuidance.observability.structuredLogging', 'vazio', 'Listar os logs relevantes da operação.');
    }
    if (arr(obs.metrics).length === 0) {
      fail('TASK_HAS_IMPLEMENTATION_GUIDANCE', scope, 'implementationGuidance.observability.metrics', 'vazio', 'Listar as métricas técnicas e de negócio.');
    }
  }
  const ts = g.testingStrategy;
  const tsEmpty = !isObj(ts) || Object.keys(ts).length === 0;
  if (tsEmpty) {
    fail('TASK_HAS_IMPLEMENTATION_GUIDANCE', scope, 'implementationGuidance.testingStrategy', 'ausente ou vazio', 'Declarar unit, integration, contract, e2e e load quando aplicável.');
  }
}

// ---------------------------------------------------------------------------
// 7. NO_EXTERNAL_REFS_IN_TASKS  (lógica CORRIGIDA — por nome de arquivo)
// ---------------------------------------------------------------------------

function walkStrings(node, keyPath, visit, ancestors = []) {
  if (typeof node === 'string') {
    visit(node, keyPath, ancestors);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v) => walkStrings(v, keyPath, visit, ancestors));
    return;
  }
  if (isObj(node)) {
    for (const [k, v] of Object.entries(node)) {
      walkStrings(v, k, visit, [...ancestors, node]);
    }
  }
}

/** `{document, section, excerpt}` com excerpt preenchido = conteúdo embutido, procedência OK. */
function isTraceabilityWithExcerpt(key, ancestors) {
  if (key !== 'document' && key !== 'section') return false;
  const parent = ancestors[ancestors.length - 1];
  return isObj(parent) && isNonEmptyString(parent.excerpt);
}

function classifyFileRef(file) {
  const f = file.toLowerCase();
  if (RULES_FILE_PATTERN.test(f) || RULES_FILE_NAMES.has(f)) return 'rules';
  if (SPEC_ARTIFACTS.has(f)) return 'spec';
  return 'unknown';
}

function checkNoExternalRefs(scope, task, exemptTechnical) {
  /** @type {Map<string, {file:string, excerpt:string, key:string, kind:string}>} */
  const hits = new Map();

  walkStrings(task, '', (str, key, ancestors) => {
    if (FILE_REF_ALLOWED_KEYS.has(key)) return;
    if (isTraceabilityWithExcerpt(key, ancestors)) return;
    const matches = str.match(SPEC_FILE_PATTERN);
    if (!matches) return;
    for (const m of matches) {
      const kind = classifyFileRef(m);
      if (kind === 'rules') continue; // implementador tem as rules
      if (exemptTechnical && m.toLowerCase() === 'test-plan.md') continue; // class=uat
      const idx = str.indexOf(m);
      const excerpt = str.slice(Math.max(0, idx - 70), idx + m.length + 25).replace(/\s+/g, ' ').trim();
      const k = `${key}:${m}`;
      if (!hits.has(k)) hits.set(k, { file: m, excerpt, key, kind });
    }
  });

  for (const { file, excerpt, key, kind } of hits.values()) {
    const msg = `referência a «${file}»: "…${excerpt}…"`;
    const fix = `Substituir a referência pelo CONTEÚDO transcrito. O implementador recebe apenas tasks.json + rules — este arquivo não está na mão dele. Se o nome é só procedência, usar {document, section, excerpt} com o excerpt preenchido.`;
    if (kind === 'spec') fail('NO_EXTERNAL_REFS_IN_TASKS', scope, key || '(raiz)', msg, fix);
    else warn('NO_EXTERNAL_REFS_IN_TASKS', scope, key || '(raiz)', `${msg} (arquivo não reconhecido — confirmar se o implementador o possui)`, fix);
  }

  // Ponteiro para documento externo SEM nome de arquivo (via de fuga do detector acima).
  // Só dispara com MARCADOR de documento externo (ver DOC_POINTER_MARKERS). Prosa PT-BR que
  // apenas MENCIONA "requisitos"/"regras de negócio"/"a especificação do enum X" não é ponteiro.
  /** @type {Set<string>} */
  const pointerSeen = new Set();
  walkStrings(task, '', (str, key, ancestors) => {
    if (FILE_REF_ALLOWED_KEYS.has(key)) return;
    if (isTraceabilityWithExcerpt(key, ancestors)) return;
    for (const { marker, re } of DOC_POINTER_MARKERS) {
      const m = re.exec(str);
      if (!m) continue;
      // Janela em volta do match: escopo interno, campo da task, alvo interno ou arquivo de
      // rules → o implementador tem acesso, não é remissão externa.
      const around = str.slice(Math.max(0, m.index - 60), m.index + m[0].length + 80);
      if (INTERNAL_SCOPE_QUALIFIER.test(around)) continue;
      if (TASK_FIELD_NOUNS.test(around)) continue;
      if (INTERNAL_TARGET_NOUN.test(around)) continue;
      if (RULES_REF_IN_WINDOW.test(around)) continue;
      const phrase = m[0].replace(/\s+/g, ' ').trim();
      const k = `${key}:${marker}:${phrase.toLowerCase()}`;
      if (pointerSeen.has(k)) continue;
      pointerSeen.add(k);
      const excerpt = around.replace(/\s+/g, ' ').trim();
      fail('NO_EXTERNAL_REFS_IN_TASKS', scope, key || '(raiz)',
        `ponteiro para documento externo (marcador «${marker}») — «${phrase}»: "…${excerpt}…"`,
        'Remeter a "o documento de requisitos" / "§4.2 do business-rules" tem o mesmo efeito que citar o arquivo: o implementador não tem acesso. Transcrever o conteúdo. Se o alvo é um campo desta própria task, qualificar ("descrito em apiContracts desta task").');
    }
  });
}

// ---------------------------------------------------------------------------
// 8. TASK_UI_HAS_FIELD_CONTRACT  (novo — fecha a lacuna de campo de tela)
// ---------------------------------------------------------------------------

function checkUiFieldContract(scope, task, exemptTechnical) {
  if (exemptTechnical) return;
  const ui = task.uiContext;

  if (!isObj(ui)) {
    // CORREÇÃO (v1.3) — `type: "frontend"` sem uiContext é WARNING, não FATAL.
    // O ramo FATAL quebrava TODO tasks.json de frontend já existente e ainda exigia inventar
    // um `tela` casando ^TEL-\d{3}$ que só existe quando há flow-map.md. A severidade FATAL
    // fica onde a informação é comprovadamente insubstituível: uiContext DECLARADO mas com
    // fields[] ausente/incompleto (ver ramo abaixo) — aí a task afirma ter contrato de tela
    // e não tem. Omissão do uiContext inteiro é lacuna de cobertura, reportada como WARNING.
    if (UI_TASK_TYPES.has(String(task.type ?? '').toLowerCase())) {
      warn('TASK_UI_HAS_FIELD_CONTRACT', scope, 'uiContext',
        `task type="${task.type}" (superfície de UI) sem uiContext`,
        'Toda task de UI deveria ter uiContext com tela (TEL-xxx do flow-map ou slug da rota), rota, estadosUI e fields[] (inventário de campos com tipo e opções transcritas). Sem flow-map.md, derivar tela/rota/estados do PR em product-requirements.md e os campos do PR + requirements.md.');
      return;
    }
    const blob = [task.title, task.description, task?.agentExecutionContext?.selfContainedSummary]
      .filter(isNonEmptyString).join(' ');
    if (UI_TEXT_SIGNAL.test(blob)) {
      warn('TASK_UI_HAS_FIELD_CONTRACT', scope, 'uiContext',
        'task aparenta tocar UI mas não tem uiContext',
        'Preencher uiContext (tela, rota, fluxo, etapa, estadosUI, regras) e o inventário de campos em uiContext.fields[].');
    }
    return;
  }

  const fields = arr(ui.fields);
  if (fields.length === 0) {
    fail('TASK_UI_HAS_FIELD_CONTRACT', scope, 'uiContext.fields',
      `tela ${ui.tela ?? ui.rota ?? '?'}: uiContext presente sem inventário de campos`,
      'Embutir fields[]: um item por campo/filtro/coluna, com name, label, type, required, e — para select/multiselect/radio/autocomplete — options[] ou optionsSource.');
    return;
  }

  fields.forEach((f, i) => {
    const field = `uiContext.fields[${i}]`;
    if (!isObj(f)) {
      fail('TASK_UI_HAS_FIELD_CONTRACT', scope, field, 'campo não é objeto', 'Shape: {name, label, type, required, options[]|optionsSource, mask, default, validations[]}.');
      return;
    }
    const fname = isNonEmptyString(f.name) ? f.name : `#${i}`;
    if (!isNonEmptyString(f.name)) {
      fail('TASK_UI_HAS_FIELD_CONTRACT', scope, `${field}.name`, 'campo sem name', 'Nome técnico do campo na tela.');
    }
    const ftype = String(f.type ?? '').toLowerCase().trim();
    if (!ftype) {
      fail('TASK_UI_HAS_FIELD_CONTRACT', scope, `${field}.type`, `campo ${fname} sem type`, 'Ex.: text, number, date, select, multiselect, checkbox, radio, autocomplete.');
      return;
    }
    if (OPTION_BEARING_FIELD_TYPES.has(ftype)) {
      const hasOptions = arr(f.options).length > 0;
      const hasSource = isNonEmptyString(f.optionsSource)
        || (isObj(f.optionsSource) && isNonEmptyString(f.optionsSource.kind));
      if (!hasOptions && !hasSource) {
        fail('TASK_UI_HAS_FIELD_CONTRACT', scope, `${field}.options`,
          `campo ${fname} é «${ftype}» e não declara options[] nem optionsSource`,
          'Listar os valores (value + label) ou declarar a origem: {kind: "enum"|"endpoint"|"domainTable", ref: "<NomeEnum|METHOD /path>"}. Enum do data-model.json deve ser TRANSCRITO, não referenciado.');
      }
    }
  });
}

// ---------------------------------------------------------------------------
// 9. TASK_SELF_SUFFICIENT_CHECK (WARNING — heurísticas de lacuna)
// ---------------------------------------------------------------------------

function checkSelfSufficientHeuristics(scope, task, exemptTechnical) {
  const summary = task?.agentExecutionContext?.selfContainedSummary ?? '';

  walkStrings(task, '', (str, key) => {
    if (PLACEHOLDER_PATTERN.test(str)) {
      warn('TASK_SELF_SUFFICIENT_CHECK', scope, key || '(raiz)',
        `conteúdo não resolvido: "${str.slice(0, 80).replace(/\s+/g, ' ')}"`,
        'Resolver o placeholder antes de emitir, ou registrar como GAP no gaps-document.md.');
    }
  });

  if (exemptTechnical) return;

  if (isNonEmptyString(summary)) {
    if (!/pré-?condi|pre-?condi/i.test(summary) || !/pós-?condi|pos-?condi/i.test(summary)) {
      warn('TASK_SELF_SUFFICIENT_CHECK', scope, 'agentExecutionContext.selfContainedSummary',
        'summary sem pré-condições e/ou pós-condições explícitas',
        'Declarar o estado exigido antes e o estado garantido depois da execução.');
    }
  }

  // `description` é FATAL para class=functional — ver SKILL.md § "description e validation —
  // exigidos por CLASSE, não pelo schema". O schema já a exigia para functional e nenhum validador
  // a cobrava: 89/147 tasks de um artefato real não a tinham. Alinhado PARA CIMA porque é o
  // primeiro texto que uma pessoa lê no cartão do ADO. `uat` e `spike` têm carrier próprio e são
  // tratadas nos seus gates (o `exemptTechnical` acima já retornou antes de chegar aqui).
  const dlen = len(task.description);
  if (!isNonEmptyString(task.description)) {
    fail('TASK_HAS_DESCRIPTION', scope, 'description',
      'description ausente — é o primeiro texto que uma pessoa lê no cartão do ADO',
      'Descrever, em uma ou duas frases completas, o que a task entrega e para quem. Não repetir o título.');
  } else if (dlen < 80) {
    fail('TASK_HAS_DESCRIPTION', scope, 'description',
      `description com ${dlen} caracteres — mínimo 80`,
      'Uma frase de título repetida não é descrição. Dizer o que a task entrega, para quem, e qual o efeito observável.');
  }

  const hasAnyContract =
    arr(task.apiContracts).length > 0 ||
    isObj(task.apiContract) ||
    isObj(task.persistenceModel) ||
    isObj(task.uiContext);
  if (!hasAnyContract) {
    warn('TASK_SELF_SUFFICIENT_CHECK', scope, '(contratos)',
      'task sem apiContracts, persistenceModel nem uiContext — nenhuma superfície declarada',
      'Confirmar que a task realmente não toca API, dados nem UI. Se tocar, embutir o contrato correspondente.');
  }
}

// ---------------------------------------------------------------------------
// 10. TASK_SUMMARY_BOILERPLATE (cross-task) — densidade, não tamanho
//
// Lição do caso real: TASK_HAS_FULL_SUMMARY (≥800 chars) passou em 76/76 tasks
// enquanto 26/76 tinham ≥60% do summary idêntico a outra task. O piso de tamanho
// é trivialmente burlável por template com o nome da capacidade substituído —
// tamanho não é densidade. Este validator mede o que interessa: quanto do summary
// é específico DAQUELA task.
//
// CORREÇÃO (v1.3) — severidade rebaixada de FATAL para WARNING.
// Jaccard de 8-shingles com limiar 0,75 dá 82–83% entre tasks IRMÃS (mesma story) que
// repetem o contexto de negócio do RF — repetição que a própria SKILL EXIGE (cada task é
// auto-suficiente, logo cada task recarrega o contexto do RF). Similaridade textual é proxy
// FRACO para o defeito real ("summary genérico ocupando o lugar do conteúdo específico"):
// bloquear backlog correto por causa dela desacredita o gate inteiro. Agora:
//   - tasks da MESMA story: limiar mais alto (0,85) e mensagem orientada a "tasks irmãs";
//   - tasks de stories DIFERENTES: limiar 0,75 (repetição cross-story é sinal mais forte);
// ambos WARNING — nunca bloqueiam. O gate bloqueante do conteúdo específico é
// TASK_UI_HAS_FIELD_CONTRACT (fields[]/options[]) + TASK_HAS_CONCRETE_TEST_DATA.
// ---------------------------------------------------------------------------

const BOILERPLATE_WARN_CROSS_STORY = 0.75;
const BOILERPLATE_WARN_SAME_STORY = 0.85;
const SHINGLE_SIZE = 8;

function shingles(text) {
  const words = String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const out = new Set();
  for (let i = 0; i + SHINGLE_SIZE <= words.length; i++) {
    out.add(words.slice(i, i + SHINGLE_SIZE).join(' '));
  }
  return out;
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  return inter / (a.size + b.size - inter);
}

function checkBoilerplate(taskList) {
  const entries = taskList
    .map(({ task, storyId }) => ({
      scope: isNonEmptyString(task?.id) ? task.id : `${storyId ?? 'STORY?'}/task-sem-id`,
      storyId: storyId ?? task?.storyId ?? null,
      klass: resolveTaskClass(task),
      text: task?.agentExecutionContext?.selfContainedSummary ?? ''
    }))
    .filter((e) => !CLASS_EXEMPT_TECHNICAL.has(e.klass) && len(e.text) > 0)
    .map((e) => ({ ...e, sh: shingles(e.text) }));

  for (let i = 0; i < entries.length; i++) {
    let worst = { j: 0, other: null, sameStory: false };
    for (let k = 0; k < entries.length; k++) {
      if (i === k) continue;
      const j = jaccard(entries[i].sh, entries[k].sh);
      const sameStory =
        entries[i].storyId !== null && entries[k].storyId !== null && entries[i].storyId === entries[k].storyId;
      const threshold = sameStory ? BOILERPLATE_WARN_SAME_STORY : BOILERPLATE_WARN_CROSS_STORY;
      if (j >= threshold && j > worst.j) worst = { j, other: entries[k].scope, sameStory };
    }
    if (!worst.other) continue;
    const pct = Math.round(worst.j * 100);
    if (worst.sameStory) {
      warn('TASK_SUMMARY_BOILERPLATE', entries[i].scope, 'agentExecutionContext.selfContainedSummary',
        `tasks irmãs muito similares — ${pct}% do summary coincide com ${worst.other} (mesma story)`,
        'Tasks irmãs repetem legitimamente o contexto do RF. Confirme que cada uma traz dados/valores ESPECÍFICOS próprios: seus campos e opções, suas colunas, seus valores de enum, seus passos de fluxo. Se a diferença estiver só no título, o conteúdo específico está a faltar.');
    } else {
      warn('TASK_SUMMARY_BOILERPLATE', entries[i].scope, 'agentExecutionContext.selfContainedSummary',
        `${pct}% do summary coincide com ${worst.other} (story diferente)`,
        'Repetição entre stories distintas é sinal de template preenchido. Verificar se o texto genérico está a ocupar o lugar do conteúdo específico da task. Tamanho não substitui densidade.');
    }
  }
}

// ---------------------------------------------------------------------------
// 11. TASK_CITES_ID_ONLY — índice em vez de conteúdo
//
// Padrão observado: "RF-MOD-SEGURADO-06 (Oferecer opções de Modalidade de
// Cobertura e Situação da Apólice)" — o ID e o TÍTULO do requisito, sem as 9
// opções que o requisito enumera. A task virou um índice do requirements.md.
// ---------------------------------------------------------------------------

const ID_CITATION_PATTERN = /\b(R[FN]|RN-NOVO|PR)-[A-Z0-9-]+\s*\(/gi;
const MIN_CITATIONS_TO_FLAG = 3;

function checkCitesIdOnly(scope, task, exemptTechnical) {
  if (exemptTechnical) return;
  const summary = task?.agentExecutionContext?.selfContainedSummary ?? '';
  const citations = summary.match(ID_CITATION_PATTERN) ?? [];
  if (citations.length < MIN_CITATIONS_TO_FLAG) return;

  const hasFields = arr(task?.uiContext?.fields).length > 0;
  const hasScenarios = arr(task.acceptanceScenarios).length > 0;
  const hasRules = arr(task.businessRules).length > 0;

  if (!hasFields && !hasScenarios && !hasRules) {
    fail('TASK_CITES_ID_ONLY', scope, 'agentExecutionContext.selfContainedSummary',
      `${citations.length} requisitos citados por ID+título, sem nenhum conteúdo derivado (sem fields[], sem acceptanceScenarios[], sem businessRules[])`,
      'A task está a indexar os requisitos em vez de os transcrever. Para cada RF citado, trazer o conteúdo: valores permitidos, opções de cada campo, colunas, cenários BDD e regras por extenso.');
  } else if (!hasScenarios) {
    warn('TASK_CITES_ID_ONLY', scope, 'agentExecutionContext.selfContainedSummary',
      `${citations.length} requisitos citados por ID+título e nenhum acceptanceScenario derivado deles`,
      'Derivar ao menos um cenário por RF citado, com testData concreto.');
  }
}

// ---------------------------------------------------------------------------
// 12. UAT_TASK_HAS_SUMMARY (FATAL para class=uat)
//
// O template da SKILL.md para a task de UAT prescreve
// `agentExecutionContext.selfContainedSummary`. No artefato real, 42/42 tasks de UAT saíram SEM
// o campo, com ~270 caracteres totais. Quem executa a homologação (PO, analista, cliente) abre o
// work item e não encontra nem o que validar nem como registrar o resultado.
//
// A isenção de UAT vale para o contrato TÉCNICO (API, dados, cenários com testData), não para o
// roteiro de execução — é justamente o roteiro que a task de UAT entrega.
// ---------------------------------------------------------------------------

function checkUatSummary(scope, task) {
  const ctx = task.agentExecutionContext;
  const summary = isObj(ctx) && isNonEmptyString(ctx.selfContainedSummary) ? ctx.selfContainedSummary : '';
  if (!summary) {
    fail('UAT_TASK_HAS_SUMMARY', scope, 'agentExecutionContext.selfContainedSummary',
      'task class=uat sem selfContainedSummary — o executor humano abre o work item e não tem roteiro',
      'Preencher conforme SKILL.md § "Task de UAT (legado)" e templates/tasks.uat-task-example.json (classe legada — a spec-tasks não gera mais tasks uat; gate NO_UAT_BACKLOG): categoria e épica validadas, quem executa, que TC-NNN percorrer, o que registrar (Aprovado/Reprovado) e onde anexar evidência de reprovação.');
    return;
  }
  const n = len(summary);
  if (n < MIN_UAT_SUMMARY_CHARS) {
    fail('UAT_TASK_HAS_SUMMARY', scope, 'agentExecutionContext.selfContainedSummary',
      `${n} caracteres — mínimo ${MIN_UAT_SUMMARY_CHARS} para task de UAT`,
      'O roteiro precisa dizer quem executa, o que percorrer, o que constitui Aprovado e o que fazer na reprovação. Menos que isso não é executável por quem não participou da especificação.');
  }
  // Os TCs cobertos precisam estar NOMEADOS na task (o executor não deve adivinhar o recorte).
  const declaredTcs = arr(task.testCaseIds).filter(isNonEmptyString);
  const mentionsTc = /\bTC-\d+/i.test(summary) || /\bTC-\d+/i.test(String(task.description ?? ''));
  if (!declaredTcs.length && !mentionsTc) {
    fail('UAT_TASK_HAS_SUMMARY', scope, 'testCaseIds',
      'task de UAT não declara testCaseIds[] nem cita nenhum TC-NNN no summary/description',
      'Listar em testCaseIds[] os casos de teste do test-plan.md cobertos por esta task e citá-los no roteiro. Sem isso não há como saber o que foi (ou não foi) homologado.');
  }
  const minOut = isObj(ctx) ? arr(ctx.minimumOutputToDeliver).filter(isNonEmptyString) : [];
  if (!minOut.length) {
    warn('UAT_TASK_HAS_SUMMARY', scope, 'agentExecutionContext.minimumOutputToDeliver',
      'task de UAT sem minimumOutputToDeliver[] — o entregável da homologação não está declarado',
      'Declarar ao menos: resultado (Aprovado/Reprovado) registrado por TC e evidência anexada quando houver reprovação.');
  }
}

// ---------------------------------------------------------------------------
// 13. SPIKE_TASK_COMPLETE (FATAL para class=spike)
//
// No artefato real os 2 spikes tinham APENAS id, adoWorkItemType, type e title. Sem pergunta de
// investigação, sem timebox, sem critério de saída, sem `description`. Um spike assim não é
// investigação delimitada — é um item aberto no board.
//
// Um spike é definido por quatro coisas, e todas são exigidas aqui:
//   pergunta a responder · timebox em dias · critério de saída (o que precisa estar DECIDIDO ao
//   final) · qual GAP fecha.
// Aceita a forma aninhada `spike{question, timeboxDays, exitCriteria[], closesGapId}` e as
// formas planas equivalentes, para tolerar artefatos escritos antes do template.
// ---------------------------------------------------------------------------

function checkSpikeComplete(scope, task) {
  const s = isObj(task.spike) ? task.spike : {};
  const field = (nested, ...flat) => {
    if (s[nested] !== undefined && !(Array.isArray(s[nested]) && s[nested].length === 0)) return s[nested];
    for (const f of flat) {
      const v = task[f];
      if (v !== undefined && !(Array.isArray(v) && v.length === 0)) return v;
    }
    return undefined;
  };

  const dlen = len(task.description);
  if (dlen < MIN_SPIKE_DESCRIPTION_CHARS) {
    fail('SPIKE_TASK_COMPLETE', scope, 'description',
      `description com ${dlen} caracteres — mínimo ${MIN_SPIKE_DESCRIPTION_CHARS}`,
      'Descrever o que é desconhecido hoje, por que bloqueia a decomposição e o que a investigação vai produzir. Um spike só com título não delimita nada.');
  }

  const question = field('question', 'investigationQuestion', 'question');
  if (!isNonEmptyString(question) || len(question) < 20) {
    fail('SPIKE_TASK_COMPLETE', scope, 'spike.question',
      'pergunta de investigação ausente ou muito curta',
      'Uma pergunta fechada, respondível ao fim do timebox (ex.: "A biblioteca X gera o PDF offline dentro de 3s no aparelho alvo?"). Pergunta aberta produz spike sem fim.');
  }

  const timebox = field('timeboxDays', 'timeboxDays', 'durationEstimatedDays');
  const days = typeof timebox === 'number' ? timebox : Number.parseFloat(String(timebox ?? ''));
  if (!Number.isFinite(days) || days <= 0) {
    fail('SPIKE_TASK_COMPLETE', scope, 'spike.timeboxDays',
      'timebox ausente — spike sem timebox não é spike',
      `Declarar spike.timeboxDays (número de dias, ≤ ${MAX_SPIKE_TIMEBOX_DAYS}). Passado o timebox, a decisão é tomada com o que se sabe e o spike encerra.`);
  } else if (days > MAX_SPIKE_TIMEBOX_DAYS) {
    warn('SPIKE_TASK_COMPLETE', scope, 'spike.timeboxDays',
      `timebox de ${days} dias excede o máximo recomendado de ${MAX_SPIKE_TIMEBOX_DAYS}`,
      'Spike longo costuma ser entrega disfarçada. Fatiar em spikes menores com perguntas independentes, ou converter em task funcional.');
  }

  const exit = field('exitCriteria', 'exitCriteria', 'exitCriterion');
  const exitList = Array.isArray(exit) ? exit.filter(isNonEmptyString) : isNonEmptyString(exit) ? [exit] : [];
  if (!exitList.length) {
    fail('SPIKE_TASK_COMPLETE', scope, 'spike.exitCriteria',
      'critério de saída ausente — não há como saber quando o spike terminou',
      'Declarar o que precisa estar DECIDIDO ao final (ex.: "biblioteca escolhida e registrada em architecture.mdc, com medição anexada"), não o que precisa estar "pesquisado".');
  }

  const gapRef = field('closesGapId', 'closesGap', 'closesGapId', 'gapId');
  const gapList = Array.isArray(gapRef) ? gapRef.filter(isNonEmptyString) : isNonEmptyString(gapRef) ? [gapRef] : [];
  if (!gapList.length) {
    fail('SPIKE_TASK_COMPLETE', scope, 'spike.closesGapId',
      'spike não declara qual GAP fecha',
      'Apontar o GAP-NNN do gaps-document.md que esta investigação resolve. Spike que não fecha gap conhecido não tem critério de valor — ou o gap não foi registrado, ou o spike não é necessário.');
  }
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

let doc;
try {
  doc = JSON.parse(readFileSync(inputPath, 'utf8'));
} catch (e) {
  console.error(`ERRO: não foi possível ler/parsear ${inputPath}: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
}

/**
 * Coleta tasks de stories[] (v5.x) e do array raiz tasks[] (modo legado).
 * `story` viaja junto porque o ramo WARNING de TASK_MISSING_API_CONTRACT /
 * TASK_MISSING_PERSISTENCE_MODEL precisa saber se o PAI declara rota/tabela.
 */
function collectTasks(document) {
  const out = [];
  for (const story of arr(document.stories)) {
    for (const t of arr(story.tasks)) out.push({ task: t, storyId: story.id, story });
  }
  for (const t of arr(document.tasks)) out.push({ task: t, storyId: null, story: null });
  return out;
}

// ---------------------------------------------------------------------------
// TASK_HAS_EFFORT_HOURS (WARNING) — a spec-tasks calcula a estimativa de esforço
// em horas por task (effortHours.manual + effortHours.aiAssisted), base bottom-up
// consumida pela spec-estimate como cross-check. Ausência NÃO quebra tasks.json
// antigos → WARNING, nunca FATAL. Só cobrado para tasks `functional` (as classes
// uat/spike têm semântica de esforço própria — roteiro humano / timebox; security
// é injetada pela spec-security-review, fora do escopo deste cálculo).
// ---------------------------------------------------------------------------
function checkEffortHours(scope, task, klass) {
  if (klass !== 'functional') return;
  const eh = task?.effortHours;
  const okNum = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (!isObj(eh) || !okNum(eh.manual) || !okNum(eh.aiAssisted)) {
    warn(
      'TASK_HAS_EFFORT_HOURS',
      scope,
      'effortHours',
      'Task sem estimativa de esforço em horas (effortHours.manual e effortHours.aiAssisted numéricos > 0).',
      'Calcular effortHours bottom-up (SKILL.md § "Estimativa de esforço em horas (dois formatos)") e emitir { manual, aiAssisted, basis }.'
    );
  }
}

const allTasks = collectTasks(doc);

if (allTasks.length === 0) {
  console.error(`ERRO: nenhuma task encontrada em ${inputPath} (stories[].tasks[] e tasks[] vazios).`);
  process.exit(2);
}

// Contrato e modelo do projeto — gatilhos de presença e requestBody por operação (ver
// loadProjectSources e «gatilhos-do-projeto»).
const PROJECT = loadProjectSources(
  [...new Set([sourcesArg, dirname(inputPath), dirname(dirname(inputPath))].filter(Boolean).map((p) => resolve(p)))]
);
const PROJECT_CITATIONS = buildProjectCitations(PROJECT);

for (const { task, storyId, story } of allTasks) {
  const scope = isNonEmptyString(task?.id) ? task.id : `${storyId ?? 'STORY?'}/task-sem-id`;
  const klass = resolveTaskClass(task);
  const exemptTechnical = CLASS_EXEMPT_TECHNICAL.has(klass);

  checkFullSummary(scope, task, exemptTechnical, klass);
  checkApiSchemas(scope, task);
  checkDataModel(scope, task);
  checkContractPresence(scope, task, exemptTechnical, story);
  checkExpandedBusinessRules(scope, task);
  checkConcreteTestData(scope, task, exemptTechnical, klass);
  checkImplementationGuidance(scope, task, exemptTechnical);
  checkNoExternalRefs(scope, task, exemptTechnical);
  checkUiFieldContract(scope, task, exemptTechnical);
  checkCitesIdOnly(scope, task, exemptTechnical);
  checkSelfSufficientHeuristics(scope, task, exemptTechnical);
  checkEffortHours(scope, task, klass);
  if (klass === 'uat') checkUatSummary(scope, task);
  if (klass === 'spike') checkSpikeComplete(scope, task);
}

checkBoilerplate(allTasks);

// Sumário por código, para priorizar a correção.
function countByCode(list) {
  const m = {};
  for (const e of list) m[e.code] = (m[e.code] ?? 0) + 1;
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
}

const tasksWithFatal = new Set(errors.map((e) => e.scope)).size;

const result = {
  ok: errors.length === 0,
  validator: 'selfsufficiency',
  input: inputPath,
  projectSources: {
    apiContracts: PROJECT.apiContracts,
    routes: PROJECT.paths.length,
    dataModel: PROJECT.dataModel,
    tables: PROJECT.tables.length
  },
  taskCount: allTasks.length,
  tasksWithFatal,
  errorCount: errors.length,
  errorsByCode: countByCode(errors),
  warningCount: warnings.length,
  warningsByCode: countByCode(warnings),
  errors: errors.slice(0, maxItems),
  warnings: warnings.slice(0, maxItems)
};

/**
 * `--write` — grava os FATAL de nível TASK em `metadata.fatalErrors[]`, no mesmo formato do
 * gêmeo de negócio ({code, message, scope, affectedField, suggestedFix}). Os dois validadores
 * escrevem no MESMO array e cada um só substitui as suas próprias entradas: os códigos de task
 * começam por `TASK_`/`UAT_`/`SPIKE_`/`NO_EXTERNAL_`, os de negócio não. Assim rodar um não apaga
 * o resultado do outro, e a ausência do campo passa a significar "validado e limpo".
 */
const TASK_LEVEL_CODE = /^(TASK_|UAT_|SPIKE_|NO_EXTERNAL_)/;
if (writeMode) {
  const payload = errors.map((e) => ({
    code: e.code,
    message: e.message,
    scope: e.scope,
    affectedField: e.field,
    suggestedFix: e.suggestedFix
  }));
  doc.metadata = isObj(doc.metadata) ? doc.metadata : {};
  const keptFromBusiness = arr(doc.metadata.fatalErrors).filter(
    (e) => isObj(e) && typeof e.code === 'string' && !TASK_LEVEL_CODE.test(e.code)
  );
  if (payload.length || keptFromBusiness.length) doc.metadata.fatalErrors = [...keptFromBusiness, ...payload];
  else delete doc.metadata.fatalErrors;
  doc.metadata.validation = {
    ...(isObj(doc.metadata.validation) ? doc.metadata.validation : {}),
    selfsufficiency: {
      ok: errors.length === 0,
      ranAt: new Date().toISOString(),
      taskCount: allTasks.length,
      tasksWithFatal,
      errorCount: errors.length,
      warningCount: warnings.length,
      errorsByCode: countByCode(errors)
    }
  };
  try {
    writeFileSync(inputPath, JSON.stringify(doc, null, 2), 'utf8');
  } catch (e) {
    console.error(`AVISO: --write falhou ao gravar ${inputPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

if (reportMode) {
  const pct = allTasks.length ? Math.round((tasksWithFatal / allTasks.length) * 100) : 0;
  console.log(`\nAuto-suficiência — ${inputPath}`);
  console.log(`Tasks analisadas: ${allTasks.length} | com FATAL: ${tasksWithFatal} (${pct}%)\n`);
  console.log(`FATAL por código:`);
  for (const [code, n] of Object.entries(result.errorsByCode)) console.log(`  ${String(n).padStart(5)}  ${code}`);
  if (!Object.keys(result.errorsByCode).length) console.log('  (nenhum)');
  console.log(`\nWARNING por código:`);
  for (const [code, n] of Object.entries(result.warningsByCode)) console.log(`  ${String(n).padStart(5)}  ${code}`);
  if (!Object.keys(result.warningsByCode).length) console.log('  (nenhum)');
  console.log(`\nPrimeiras ocorrências FATAL:`);
  for (const e of errors.slice(0, 25)) console.log(`  [${e.code}] ${e.scope} · ${e.field}\n      ${e.message}\n      → ${e.suggestedFix}`);
  console.log('');
} else {
  console.log(JSON.stringify(result, null, 2));
}

process.exit(errors.length === 0 ? 0 : 1);
