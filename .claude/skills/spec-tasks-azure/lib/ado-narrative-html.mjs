// GÊMEO: mantém paridade com ../../spec-tasks-html/lib/render-html.mjs (incl. bloco "Contexto de UI"/uiContext).
// Diferença deliberada no screenshot: aqui o ADO anexa como attachment (azureDevopsService.js); o HTML embute em base64.
// Ao editar o schema v5.3, atualizar ambos.
// Paridade do inventário de campos: `fields[]` (tabela), `grid` e `filterBehavior` são renderizados
// aqui (uiFieldsTableHtml/uiGridHtml/uiFilterBehaviorHtml) e no gêmeo
// (renderUiFieldsTable/renderUiGrid/renderUiFilterBehavior). O schema declara esse conteúdo
// insubstituível — o screenshot NÃO o substitui, porque o agente implementador não lê imagens.
/**
 * Descrições legíveis para Azure DevOps (HTML), alinhadas ao relatório tasks-to-html.
 * Sem o dump monolítico do tasks.json — detalhes como texto/listas; exemplos API como JSON formatado em <pre>.
 */

const PRE_STYLE =
  ' style="white-space:pre-wrap;word-break:break-word;font-family:Consolas,Courier New,monospace;font-size:12px;line-height:1.35;"';

/** @param {unknown} v @returns {v is Record<string, unknown>} */
function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** @param {unknown} v @returns {string[]} */
function asStrArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string');
}

/** @param {unknown} v @returns {Record<string, unknown>[]} */
function asObjArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter(isObj);
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converte texto plano multi-linha em HTML seguro para campos do Azure DevOps
 * (System.Description, Microsoft.VSTS.Common.AcceptanceCriteria etc. renderizam HTML —
 * `\n` cru é colapsado pelo navegador).
 *
 * Contrato: a ENTRADA é texto plano (nunca HTML pronto) — o escape acontece aqui, uma única vez.
 * Onde o chamador já monta HTML explícito, NÃO aplicar este helper por cima (dupla conversão).
 * - Blocos separados por linha em branco viram `<p>...</p>`;
 * - `\n` simples dentro do bloco vira `<br>`;
 * - sequências de linhas iniciando com `- `/`* ` viram `<ul><li>`, e com `N. ` viram `<ol><li>`;
 * - null/undefined/'' retornam ''.
 * @param {unknown} str
 * @returns {string}
 */
export function textToHtml(str) {
  if (str === null || str === undefined) return '';
  const text = String(str).replace(/\r\n?/g, '\n').trim();
  if (!text) return '';
  const blocks = text.split(/\n[ \t]*\n+/);
  /** @type {string[]} */
  const out = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    /** @type {string[]} */
    let plain = [];
    /** @type {{ tag: 'ul' | 'ol', items: string[] } | null} */
    let list = null;
    const flushPlain = () => {
      if (plain.length) {
        out.push(`<p>${plain.map((l) => escapeHtml(l)).join('<br>')}</p>`);
        plain = [];
      }
    };
    const flushList = () => {
      if (list) {
        out.push(`<${list.tag}>${list.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</${list.tag}>`);
        list = null;
      }
    };
    for (const line of lines) {
      const ul = /^[-*]\s+(.*)$/.exec(line);
      const ol = /^\d+\.\s+(.*)$/.exec(line);
      const tag = ul ? 'ul' : ol ? 'ol' : null;
      if (tag) {
        flushPlain();
        if (list && list.tag !== tag) flushList();
        if (!list) list = { tag, items: [] };
        list.items.push((ul || ol)[1]);
      } else {
        flushList();
        plain.push(line);
      }
    }
    flushList();
    flushPlain();
  }
  return out.join('');
}

/**
 * Coerção segura de um valor qualquer para texto plano.
 *
 * `String(valor)` em objeto/array produzia `[object Object]` na description do work item
 * (o tasks.json é gerado por LLM: um campo declarado como string pode chegar como objeto).
 * Aqui: string passa direto; primitivos viram texto; objeto/array é serializado em JSON;
 * o que não tem representação textual útil (symbol/function) vira string vazia.
 * @param {unknown} v
 * @returns {string}
 */
function toPlainText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Versão inline do textToHtml: escapa e converte `\n` em `<br>`, sem gerar `<p>`/`<ul>`.
 * Para valores exibidos após um rótulo na mesma linha (ex.: `<p><strong>Objetivo:</strong> ...</p>`)
 * ou dentro de `<li>`, onde elementos de bloco não cabem. Mesmo contrato: entrada é texto plano.
 * Não-string: nunca `[object Object]` — ver toPlainText.
 * @param {unknown} str
 * @returns {string}
 */
export function textToInlineHtml(str) {
  const text = toPlainText(str).replace(/\r\n?/g, '\n').trim();
  if (!text) return '';
  return escapeHtml(text).replace(/\n[ \t]*/g, '<br>');
}

/** @param {string} label @param {unknown} obj */
function jsonPre(label, obj) {
  if (obj === undefined || obj === null) return '';
  let text;
  try {
    text = JSON.stringify(obj, null, 2);
  } catch {
    text = String(obj);
  }
  return `<h3><strong>${escapeHtml(label)}</strong></h3><pre${PRE_STYLE}><code>${escapeHtml(text)}</code></pre>`;
}

/** @param {Record<string, unknown>} b */
function businessRuleHtml(b) {
  const id = typeof b.id === 'string' ? b.id : '';
  const desc = typeof b.description === 'string' ? b.description : '';
  const cond = typeof b.condition === 'string' ? b.condition : '';
  const exact = typeof b.exactValue === 'string' ? b.exactValue : '';
  const pri = typeof b.priority === 'string' ? b.priority : '';
  const sv = isObj(b.sourceVd) ? b.sourceVd : null;
  const exc = asStrArray(b.exceptions);
  const conf = asStrArray(b.conflictsWith);
  
  const extras = [
    cond ? `<p><strong>Condição:</strong> ${textToInlineHtml(cond)}</p>` : '',
    exact ? `<p><strong>Valor:</strong> ${textToInlineHtml(exact)}</p>` : '',
    sv
      ? `<p><strong>DV:</strong> §${escapeHtml(String(sv.section || ''))} · <code>${escapeHtml(
          String(sv.itemId || '')
        )}</code> — ${textToInlineHtml(sv.excerpt)}</p>`
      : '',
    exc.length ? `<p><strong>Exceções:</strong> ${textToInlineHtml(exc.join('; '))}</p>` : '',
    conf.length ? `<p><strong>Conflita com:</strong> ${escapeHtml(conf.join(', '))}</p>` : '',
  ]
    .filter(Boolean)
    .join('');
  return `<li><p><code>${escapeHtml(id)}</code>${pri ? ` (${escapeHtml(pri)})` : ''} — ${textToInlineHtml(desc)}</p>${extras}</li>`;
}

/**
 * Bloco de RASTREABILIDADE — aceita as DUAS formas que o pipeline emite.
 *
 * DEFEITO CORRIGIDO: o renderer chamava `asObjArray(story.traceability)`, que devolve `[]` para
 * qualquer valor que não seja array. O schema emite `traceability` como OBJETO — `{rf,
 * productRequirement}` na story e `{sourceStoryIds, sourceTaskIds}` depois do enriquecimento —
 * então a rastreabilidade era descartada em silêncio: nenhum erro, nenhum bloco no work item.
 * O mesmo defeito existia no bloco da task.
 *
 *  - ARRAY  → comportamento anterior preservado: lista de refs {section, itemId, excerpt}.
 *  - OBJETO → lista de pares chave/valor legíveis. Escalares viram texto; arrays viram lista
 *             separada por vírgula; objetos aninhados (ex.: sourceVd) viram JSON compacto.
 *
 * @param {unknown} trace
 * @param {string} titulo rótulo do bloco ('Rastreabilidade (história)', 'Rastreabilidade')
 */
function traceabilityHtml(trace, titulo) {
  /** Rótulos legíveis para as chaves conhecidas do schema. */
  const LABELS = {
    rf: 'Requisito funcional (RF)',
    rnf: 'Requisito não funcional (RNF)',
    productRequirement: 'Requisito de produto (PR)',
    requirementIds: 'Requisitos',
    ruleIds: 'Regras de negócio (RN)',
    relatedRuleIds: 'Regras de negócio (RN)',
    sourceStoryIds: 'Histórias de origem',
    sourceTaskIds: 'Tarefas de origem',
    legalBasis: 'Base legal',
    section: 'Seção',
    itemId: 'Item',
    excerpt: 'Trecho',
    document: 'Documento'
  };

  if (Array.isArray(trace)) {
    const items = asObjArray(trace);
    if (!items.length) return '';
    const lis = items
      .map((tr) => {
        const section = String(tr.section ?? tr.document ?? '');
        const itemId = String(tr.itemId ?? '');
        const excerpt = tr.excerpt ?? '';
        const head = [section ? escapeHtml(section) : '', itemId ? `<code>${escapeHtml(itemId)}</code>` : '']
          .filter(Boolean)
          .join(' · ');
        const body = excerpt ? ` — ${textToInlineHtml(excerpt)}` : '';
        const line = `${head}${body}`.trim();
        return line ? `<li>${line}</li>` : '';
      })
      .filter(Boolean)
      .join('');
    return lis ? `<h2><strong>${escapeHtml(titulo)}</strong></h2><ul>${lis}</ul>` : '';
  }

  if (!isObj(trace)) return '';
  const lis = Object.entries(trace)
    .map(([key, value]) => {
      if (value === null || value === undefined || value === '') return '';
      const label = LABELS[key] ?? key;
      let rendered;
      if (Array.isArray(value)) {
        const flat = value
          .map((v) => (isObj(v) ? toPlainText(v) : String(v)))
          .map((v) => v.trim())
          .filter(Boolean);
        if (!flat.length) return '';
        rendered = flat.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ');
      } else if (isObj(value)) {
        rendered = `<code>${escapeHtml(toPlainText(value))}</code>`;
      } else {
        rendered = textToInlineHtml(value);
      }
      return `<li><strong>${escapeHtml(String(label))}:</strong> ${rendered}</li>`;
    })
    .filter(Boolean)
    .join('');
  return lis ? `<h2><strong>${escapeHtml(titulo)}</strong></h2><ul>${lis}</ul>` : '';
}

/**
 * `sourceRefs[]` — de ONDE veio o negócio deste nível ({document, section, itemId}). Sem este
 * bloco, quem lê o cartão no ADO não consegue voltar ao requirements.md / business-rules.md que
 * o originou.
 * @param {unknown} refs
 */
function sourceRefsHtml(refs) {
  const items = asObjArray(refs).filter((r) => r.document || r.itemId);
  if (!items.length) return '';
  const lis = items
    .map((r) => {
      const doc = String(r.document ?? '');
      const section = String(r.section ?? '');
      const itemId = String(r.itemId ?? '');
      const parts = [
        itemId ? `<code>${escapeHtml(itemId)}</code>` : '',
        doc ? escapeHtml(doc) : '',
        section ? `§ ${escapeHtml(section)}` : ''
      ].filter(Boolean);
      return parts.length ? `<li>${parts.join(' · ')}</li>` : '';
    })
    .filter(Boolean)
    .join('');
  return lis ? `<h3><strong>Origem na especificação</strong></h3><ul>${lis}</ul>` : '';
}

/**
 * Narrativa de negócio v5.3 (`BusinessNarrative`) — carrier canônico e obrigatório em
 * Epic, Feature e Story. Renderiza elevatorPitch, context, problem, deliveredValue,
 * actors, mainFlow, operationalImpact e regulatoryContext.
 * @param {unknown} n
 * @param {string} nivel rótulo do nível ('história', 'épico', 'feature')
 */
function businessNarrativeHtml(n, nivel) {
  if (!isObj(n)) return '';
  const pitch = typeof n.elevatorPitch === 'string' ? n.elevatorPitch : '';
  const ctx = typeof n.context === 'string' ? n.context : '';
  const problem = typeof n.problem === 'string' ? n.problem : '';
  const value = typeof n.deliveredValue === 'string' ? n.deliveredValue : '';
  const stmt = typeof n.userStoryStatement === 'string' ? n.userStoryStatement : '';
  const actors = asStrArray(n.actors);
  const flow = asStrArray(n.mainFlow);
  const opImpact = typeof n.operationalImpact === 'string' ? n.operationalImpact : '';
  const reg = typeof n.regulatoryContext === 'string' ? n.regulatoryContext : '';

  // Dedup pitch/context: o contexto só é omitido/fatiado quando começa EXATAMENTE com o pitch
  // (context = pitch + complemento). Duas armadilhas corrigidas aqui:
  //  1. sem pitch, `ctx.startsWith(pitch.slice(0, 80))` era sempre true e o contexto desaparecia
  //     — épico/feature/história chegavam ao ADO sem uma linha de narrativa;
  //  2. comparar por prefixo de 80 chars e fatiar por `pitch.length` perdia caracteres reais
  //     quando o pitch tinha mais de 80 chars e divergia do contexto depois do 80º.
  // Comparação e fatia agora usam a MESMA medida: o pitch inteiro.
  const ctxStartsWithPitch = pitch !== '' && ctx.startsWith(pitch);
  const ctxBlock = !ctx
    ? ''
    : !ctxStartsWithPitch
      ? `<p>${textToInlineHtml(ctx)}</p>`
      : ctx.length > pitch.length
        ? `<p>${textToInlineHtml(ctx.slice(pitch.length).trim())}</p>`
        : '';

  const inner = [
    pitch ? `<p>${textToInlineHtml(pitch)}</p>` : '',
    ctxBlock,
    stmt ? `<p><em>${textToInlineHtml(stmt)}</em></p>` : '',
    problem ? `<p><strong>Problema:</strong> ${textToInlineHtml(problem)}</p>` : '',
    value ? `<p><strong>Valor entregue:</strong> ${textToInlineHtml(value)}</p>` : '',
    actors.length ? `<p><strong>Atores:</strong> ${actors.map((a) => escapeHtml(a)).join(', ')}</p>` : '',
    flow.length ? `<h3><strong>Fluxo de negócio</strong></h3><ol>${flow.map((s) => `<li>${textToInlineHtml(s)}</li>`).join('')}</ol>` : '',
    opImpact ? `<p><strong>Impacto operacional:</strong> ${textToInlineHtml(opImpact)}</p>` : '',
    reg ? `<p><strong>Contexto regulatório:</strong> ${textToInlineHtml(reg)}</p>` : ''
  ]
    .filter(Boolean)
    .join('');

  return inner ? `<h2><strong>Negócio (${escapeHtml(nivel)})</strong></h2>${inner}` : '';
}

/** userStory {asA, iWant, soThat} — formato clássico, ausente do payload ADO até aqui. */
function userStoryHtml(us) {
  if (!isObj(us)) return '';
  const a = typeof us.asA === 'string' ? us.asA : '';
  const w = typeof us.iWant === 'string' ? us.iWant : '';
  const s = typeof us.soThat === 'string' ? us.soThat : '';
  if (!a && !w && !s) return '';
  return `<h2><strong>História de usuário</strong></h2><p><strong>Como</strong> ${textToInlineHtml(a)}<br><strong>quero</strong> ${textToInlineHtml(w)}<br><strong>para</strong> ${textToInlineHtml(s)}</p>`;
}

/** deliveryScope[] {taskId, title, businessOutcome} — escopo de entrega por task. */
function deliveryScopeHtml(scope) {
  const items = asObjArray(scope);
  if (!items.length) return '';
  const rows = items
    .map((it) => {
      const id = typeof it.taskId === 'string' ? it.taskId : '';
      const title = typeof it.title === 'string' ? it.title : '';
      const outcome = typeof it.businessOutcome === 'string' ? it.businessOutcome : '';
      return `<tr><td><code>${escapeHtml(id)}</code></td><td>${textToInlineHtml(title)}</td><td>${textToInlineHtml(outcome)}</td></tr>`;
    })
    .join('');
  return `<h2><strong>Escopo de entrega</strong></h2><table><thead><tr><th>Task</th><th>Título</th><th>Resultado de negócio</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function storyRisksHtml(risks) {
  if (!risks.length) return '';
  const items = risks
    .map((r) => {
      if (typeof r === 'string') return `<li>${textToInlineHtml(r)}</li>`;
      if (!isObj(r)) return '';
      const d = typeof r.description === 'string' ? r.description : '';
      const m = typeof r.mitigation === 'string' ? r.mitigation : '';
      return `<li><strong>${textToInlineHtml(d)}</strong>${m ? ` — <em>Mitigação:</em> ${textToInlineHtml(m)}` : ''}</li>`;
    })
    .filter(Boolean)
    .join('');
  if (!items) return '';
  return `<h3><strong>Riscos</strong></h3><ul>${items}</ul>`;
}

/** @param {string} title @param {string[]} lines */
function bulletsHtml(title, lines) {
  const clean = lines.map((s) => String(s).trim()).filter(Boolean);
  if (!clean.length) return '';
  return `<h4><strong>${escapeHtml(title)}</strong></h4><ul>${clean.map((l) => `<li>${textToInlineHtml(l)}</li>`).join('')}</ul>`;
}

/**
 * Critérios de aceite nas DUAS formas emitidas — objetos `{id, statement}` e STRINGS soltas.
 * Normaliza para `{id, statement}`, descartando entradas sem enunciado.
 * GÊMEO de ../../spec-tasks-html/lib/render-html.mjs → normalizeCriteriaList().
 * @param {unknown} criteria
 * @returns {{id:string, statement:string}[]}
 */
function normalizeCriteria(criteria) {
  if (!Array.isArray(criteria)) return [];
  return criteria
    .map((c) => {
      if (typeof c === 'string') {
        const text = c.trim();
        if (!text) return null;
        // "AC-X-01 — texto": separa o id quando a string já o traz embutido.
        const m = /^([A-Z][A-Z0-9-]{2,})\s*[—–-]\s*([\s\S]+)$/.exec(text);
        return m ? { id: m[1], statement: m[2].trim() } : { id: '', statement: text };
      }
      if (!isObj(c)) return null;
      const st = typeof c.statement === 'string' ? c.statement.trim() : '';
      if (!st) return null;
      return { id: typeof c.id === 'string' ? c.id : '', statement: st };
    })
    .filter(Boolean);
}

/** Lista de IDs/códigos numa linha (`<code>` separados por ·). Aceita string única ou array. */
function codeListHtml(title, value) {
  const list = Array.isArray(value) ? asStrArray(value) : typeof value === 'string' && value.trim() ? [value] : [];
  if (!list.length) return '';
  return `<p><strong>${escapeHtml(title)}:</strong> ${list.map((x) => `<code>${escapeHtml(x)}</code>`).join(' · ')}</p>`;
}

/** @param {Record<string, unknown>} ctx */
function agentExecutionHtml(ctx) {
  if (!isObj(ctx)) return '';
  const summary = typeof ctx.selfContainedSummary === 'string' ? ctx.selfContainedSummary.trim() : '';
  const warn = asStrArray(ctx.criticalWarnings);
  const dont = asStrArray(ctx.doNotDo);
  const verify = asStrArray(ctx.verificationBeforeStart);
  const minOut = asStrArray(ctx.minimumOutputToDeliver);
  const parts = [];
  if (summary) {
    parts.push(`<h3><strong>Resumo (contexto de execução)</strong></h3>${textToHtml(summary)}`);
  }
  if (warn.length) {
    parts.push(
      `<h3><strong>Avisos críticos</strong></h3><ul>${warn.map((w) => `<li>${textToInlineHtml(w)}</li>`).join('')}</ul>`
    );
  }
  if (dont.length) {
    parts.push(`<h3><strong>Não fazer</strong></h3><ul>${dont.map((w) => `<li>${textToInlineHtml(w)}</li>`).join('')}</ul>`);
  }
  parts.push(bulletsHtml('Verificar antes de começar', verify));
  parts.push(bulletsHtml('Entregáveis mínimos', minOut));
  return parts.filter(Boolean).join('');
}

/** @param {string} label @param {string[]} items */
function diagListHtml(label, items) {
  if (!items.length) return '';
  return `<p><strong>${escapeHtml(label)}</strong></p><ul>${items.map((x) => `<li>${textToInlineHtml(x)}</li>`).join('')}</ul>`;
}

/** @param {Record<string, unknown>} d */
function existingCodeDiagnosisHtml(d) {
  if (!isObj(d)) return '';
  const impact = typeof d.impactType === 'string' ? d.impactType : '';
  const strategy = typeof d.discoveryStrategy === 'string' ? d.discoveryStrategy : '';
  const parts = [
    impact ? `<p><strong>Impacto:</strong> ${escapeHtml(impact)}</p>` : '',
    strategy ? `<p><strong>Estratégia de descoberta:</strong> ${textToInlineHtml(strategy)}</p>` : '',
    diagListHtml('Já existe e funciona', asStrArray(d.alreadyBuiltAndWorking)),
    diagListHtml('Existe mas precisa refatorar', asStrArray(d.existsButNeedsRefactoring)),
    diagListHtml('Criar do zero', asStrArray(d.mustBeCreatedFromScratch)),
    diagListHtml('Bloqueadores técnicos', asStrArray(d.technicalBlockers)),
    diagListHtml('Antipadrões', asStrArray(d.antiPatterns)),
    diagListHtml('Ordem de refatoração', asStrArray(d.refactoringOrder)),
    diagListHtml('Arquivos hipótese', asStrArray(d.hypothesisFiles)),
    diagListHtml('Riscos de regressão', asStrArray(d.regressionRisks)),
  ].filter(Boolean);
  if (!parts.length) return '';
  return `<h3><strong>Diagnóstico de código existente</strong></h3>${parts.join('')}`;
}

/** @param {Record<string, unknown>} tc */
function technicalContextHtml(tc) {
  if (!isObj(tc)) return '';
  const obs = typeof tc.observations === 'string' ? tc.observations.trim() : '';
  const patterns = asStrArray(tc.patternsFromRules);
  if (!obs && !patterns.length) return '';
  const patBlock = patterns.length
    ? `<p><strong>Padrões das regras</strong></p><ul>${patterns.map((p) => `<li>${textToInlineHtml(p)}</li>`).join('')}</ul>`
    : '';
  return `<h3><strong>Contexto técnico</strong></h3>${textToHtml(obs)}${patBlock}`;
}

/** @param {unknown[]} steps */
function implementationStepsHtml(steps) {
  if (!Array.isArray(steps) || !steps.length) return '';
  return `<h3><strong>Passos de implementação</strong></h3><ol>${steps.map((s) => `<li>${textToInlineHtml(s)}</li>`).join('')}</ol>`;
}

/** @param {string} h @param {string[]} items */
function valListHtml(h, items) {
  if (!items.length) return '';
  return `<p><strong>${escapeHtml(h)}</strong></p><ul>${items.map((l) => `<li>${textToInlineHtml(l)}</li>`).join('')}</ul>`;
}

/** @param {Record<string, unknown>} v */
function validationHtml(v) {
  if (!isObj(v)) return '';
  const biz = asStrArray(v.businessCriteria);
  const tech = asStrArray(v.technicalCriteria);
  const cmds = asStrArray(v.exactTestCommands);
  const checklist = asStrArray(v.validationChecklist);
  const matrix = asObjArray(v.mandatoryTestMatrix);
  
  const un = asObjArray(v.unitTestScenarios);
  const fn = asObjArray(v.functionalTestScenarios);
  const e2e = asObjArray(v.e2eTestScenarios);
  const ld = asObjArray(v.loadTestScenarios);
  const cs = isObj(v.testCoverageSummary) ? v.testCoverageSummary : null;

  const hasAny = biz.length || tech.length || cmds.length || checklist.length || matrix.length || un.length || fn.length || e2e.length || ld.length || cs;
  if (!hasAny) return '';
  
  const matrixRows = matrix
    .map((row) => {
      const cat = typeof row.category === 'string' ? row.category : '';
      const scope = typeof row.scope === 'string' ? row.scope : '';
      const hint = row.toolOrCommandHint != null ? String(row.toolOrCommandHint) : '';
      return `<tr><td>${escapeHtml(cat)}</td><td>${escapeHtml(scope)}</td><td>${escapeHtml(hint)}</td></tr>`;
    })
    .join('');
  const table = matrixRows
    ? `<table border="1" cellpadding="4" cellspacing="0"><thead><tr><th>Categoria</th><th>Escopo</th><th>Ferramenta / comando</th></tr></thead><tbody>${matrixRows}</tbody></table>`
    : '';

  let scenariosHtml = '';
  if (un.length) scenariosHtml += testScenariosGroup('Testes Unitários', un);
  if (fn.length) scenariosHtml += testScenariosGroup('Testes Funcionais/Integração', fn);
  if (e2e.length) scenariosHtml += testScenariosGroup('Testes E2E', e2e);
  if (ld.length) scenariosHtml += testScenariosGroup('Testes de Carga', ld);

  let covHtml = '';
  if (cs) {
    const catsStr = asStrArray(cs.categoriesCovered).join(', ');
    const gapsStr = asStrArray(cs.gapsInTesting).join('; ');
    covHtml = `<p><strong>Cobertura Eixos:</strong> Unit (${cs.unitTotal || 0}), Func (${cs.functionalTotal || 0}), E2E (${cs.e2eTotal || 0}), Load (${cs.loadTotal || 0})</p>` +
              (catsStr ? `<p><strong>Categorias:</strong> ${escapeHtml(catsStr)}</p>` : '') +
              (gapsStr ? `<p><strong>Gaps de Teste:</strong> ${escapeHtml(gapsStr)}</p>` : '');
  }

  return `<h3><strong>Validação e testes</strong></h3>
    ${valListHtml('Critérios de negócio', biz)}
    ${valListHtml('Critérios técnicos', tech)}
    ${valListHtml('Comandos de teste', cmds)}
    ${valListHtml('Checklist', checklist)}
    ${table}
    ${covHtml}
    ${scenariosHtml}`;
}

/** @param {Record<string, unknown>[]} errors */
function responseErrorsHtml(errors) {
  if (!errors.length) return '';
  const rows = errors
    .map((e) => {
      const st = e.httpStatus != null ? String(e.httpStatus) : '';
      const cond = typeof e.condition === 'string' ? e.condition : '';
      let body = '';
      if (e.bodyExample !== undefined) {
        try {
          body = JSON.stringify(e.bodyExample, null, 2);
        } catch {
          body = String(e.bodyExample);
        }
      }
      return `<tr><td><code>${escapeHtml(st)}</code></td><td>${escapeHtml(cond)}</td><td><pre${PRE_STYLE}><code>${escapeHtml(
        body
      )}</code></pre></td></tr>`;
    })
    .join('');
  return `<h4><strong>Respostas de erro (API)</strong></h4><table border="1" cellpadding="4" cellspacing="0"><thead><tr><th>HTTP</th><th>Condição</th><th>Corpo (exemplo)</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** @param {Record<string, unknown>[]} semantics */
function httpSemanticsHtml(semantics) {
  if (!semantics.length) return '';
  const rows = semantics
    .map((h) => {
      const st = h.status != null ? String(h.status) : '';
      const m = typeof h.meaning === 'string' ? h.meaning : '';
      return `<tr><td><code>${escapeHtml(st)}</code></td><td>${escapeHtml(m)}</td></tr>`;
    })
    .join('');
  return `<h4><strong>Semântica HTTP</strong></h4><table border="1" cellpadding="4" cellspacing="0"><thead><tr><th>Status</th><th>Significado</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** @param {Record<string, unknown>} pm */
function persistenceModelHtml(pm) {
  if (!isObj(pm)) return '';
  // v5.2 compact-prose: entities[]
  if (Array.isArray(pm.entities)) {
    const src = pm.source ? `<p><strong>Fonte:</strong> ${escapeHtml(String(pm.source))}</p>` : '';
    const items = asObjArray(pm.entities).map(e => {
      // Schema v5.3 exige `table`; `name` é fallback legado. Ler só `name` deixava o
      // nome da tabela vazio no ADO (o twin spec-tasks-html lê `table`).
      const name = typeof e.table === 'string' && e.table
        ? e.table
        : (typeof e.name === 'string' ? e.name : '');
      const op = typeof e.operationType === 'string' ? e.operationType : '';
      const cols = typeof e.columns === 'string' ? `<p><strong>Colunas:</strong></p><pre${PRE_STYLE}><code>${escapeHtml(e.columns)}</code></pre>` : '';
      const rels = typeof e.relationships === 'string' ? `<p><strong>Relacionamentos:</strong></p><pre${PRE_STYLE}><code>${escapeHtml(e.relationships)}</code></pre>` : '';
      const idx = typeof e.indexes === 'string' ? `<p><strong>Índices:</strong></p><pre${PRE_STYLE}><code>${escapeHtml(e.indexes)}</code></pre>` : '';
      return `<li><strong>${escapeHtml(name)}</strong> (${escapeHtml(op)})${cols}${rels}${idx}</li>`;
    }).join('');
    return `<h3><strong>Modelo de Persistência</strong></h3>${src}<ul>${items}</ul>`;
  }
  // v3/v4 com artifacts[]
  const src = pm.source ? `<p><strong>Fonte:</strong> ${escapeHtml(String(pm.source))}</p>` : '';
  const artifacts = asObjArray(pm.artifacts).map(a => {
    const name = typeof a.name === 'string' ? a.name : '';
    const op = typeof a.operationType === 'string' ? a.operationType : '';
    const cols = asObjArray(a.columnsOrFields).map(c => `<li><code>${escapeHtml(String(c.name))}</code> (${escapeHtml(String(c.type))}) - ${escapeHtml(String(c.operationType))}</li>`).join('');
    return `<li><strong>${escapeHtml(name)}</strong> (${escapeHtml(op)})<ul>${cols}</ul></li>`;
  }).join('');
  return `<h3><strong>Modelo de Persistência</strong></h3>${src}<ul>${artifacts}</ul>`;
}

/** @param {Record<string, unknown>[]} ai */
function asyncInterfacesHtml(ai) {
  if (!ai.length) return '';
  const items = ai.map(a => {
    return `<li><strong>${escapeHtml(String(a.name))}</strong> (${escapeHtml(String(a.kind))} / ${escapeHtml(String(a.direction))}) - ${escapeHtml(String(a.operationType))}<br>Payload: ${textToInlineHtml(a.payloadSummary)}</li>`;
  }).join('');
  return `<h3><strong>Interfaces Assíncronas</strong></h3><ul>${items}</ul>`;
}

/** @param {Record<string, unknown>} ig */
function implementationGuidanceHtml(ig) {
  if (!isObj(ig)) return '';
  const arch = asStrArray(ig.architecturalDecisions);
  const dataFlow = asStrArray(ig.dataFlow);
  const parts = [];
  if (arch.length) parts.push(`<h4><strong>Decisões arquiteturais</strong></h4><ul>${arch.map(a => `<li>${textToInlineHtml(a)}</li>`).join('')}</ul>`);
  if (dataFlow.length) parts.push(`<h4><strong>Fluxo de dados</strong></h4><ol>${dataFlow.map(f => `<li>${textToInlineHtml(f)}</li>`).join('')}</ol>`);
  // Pode expandir para security/performance, mas o payload ADO deve ser mantido curto
  if (!parts.length) return '';
  return `<h3><strong>Guia de implementação</strong></h3>${parts.join('')}`;
}

/**
 * Célula "Opções" de um UiField: options[] TRANSCRITAS (value/label/default/notes) +
 * optionsSource (kind/ref/notes). O schema é explícito: para kind=enum|domainTable os valores
 * devem estar transcritos em options[]; optionsSource sozinho só vale para kind=endpoint.
 * @param {Record<string, unknown>} f
 */
function uiFieldOptionsCell(f) {
  const opts = asObjArray(f.options)
    .map((o) => {
      const value = o.value !== undefined ? toPlainText(o.value) : '';
      const label = typeof o.label === 'string' ? o.label : '';
      const isDefault = o.default === true;
      const notes = typeof o.notes === 'string' ? o.notes : '';
      if (!value && !label) return '';
      return `${value ? `<code>${escapeHtml(value)}</code>` : ''}${label ? ` — ${textToInlineHtml(label)}` : ''}${isDefault ? ' <em>(padrão)</em>' : ''}${notes ? ` <em>${textToInlineHtml(notes)}</em>` : ''}`;
    })
    .filter(Boolean);

  const src = isObj(f.optionsSource) ? f.optionsSource : null;
  const srcLine = src
    ? (() => {
        const kind = typeof src.kind === 'string' ? src.kind : '';
        const ref = typeof src.ref === 'string' ? src.ref : '';
        const notes = typeof src.notes === 'string' ? src.notes : '';
        const body = [kind ? escapeHtml(kind) : '', ref ? `<code>${escapeHtml(ref)}</code>` : '']
          .filter(Boolean)
          .join(' · ');
        if (!body && !notes) return '';
        return `<em>Fonte:</em> ${body}${notes ? ` — ${textToInlineHtml(notes)}` : ''}`;
      })()
    : '';

  const cell = [...opts, srcLine].filter(Boolean).join('<br>');
  return cell || '—';
}

/**
 * Célula "Formato/limites" de um UiField: seleção, máscara, formato, placeholder, default,
 * min/max, maxLength e searchableBy — tudo o que o implementador precisa sem abrir outro arquivo.
 * @param {Record<string, unknown>} f
 */
function uiFieldConstraintsCell(f) {
  const searchable = asStrArray(f.searchableBy);
  const pairs = [
    ['Seleção', typeof f.selection === 'string' ? f.selection : ''],
    ['Máscara', typeof f.mask === 'string' ? f.mask : ''],
    ['Formato', typeof f.format === 'string' ? f.format : ''],
    ['Placeholder', typeof f.placeholder === 'string' ? f.placeholder : ''],
    ['Default', f.default !== undefined ? toPlainText(f.default) : ''],
    ['Mín.', f.min !== undefined ? toPlainText(f.min) : ''],
    ['Máx.', f.max !== undefined ? toPlainText(f.max) : ''],
    ['Tam. máx.', f.maxLength !== undefined ? toPlainText(f.maxLength) : ''],
    ['Busca por', searchable.length ? searchable.join(', ') : ''],
  ]
    .filter(([, v]) => String(v).trim() !== '')
    .map(([k, v]) => `<strong>${escapeHtml(String(k))}:</strong> ${textToInlineHtml(v)}`);
  return pairs.length ? pairs.join('<br>') : '—';
}

/** Célula "Validações" de um UiField: regra → mensagem exibida. @param {Record<string, unknown>} f */
function uiFieldValidationsCell(f) {
  const lines = asObjArray(f.validations)
    .map((v) => {
      const rule = typeof v.rule === 'string' ? v.rule : '';
      const msg = typeof v.errorMessage === 'string' ? v.errorMessage : '';
      if (!rule && !msg) return '';
      return `${rule ? textToInlineHtml(rule) : ''}${msg ? ` → <em>${textToInlineHtml(msg)}</em>` : ''}`;
    })
    .filter(Boolean);
  return lines.length ? lines.join('<br>') : '—';
}

/**
 * Tabela do INVENTÁRIO DE CAMPOS (uiContext.fields[] — `UiField` do schema v5.3).
 * Obrigatório quando existe uiContext: o screenshot NÃO substitui este inventário, porque o
 * agente implementador não lê imagens. Sem esta tabela, listas de opções de dropdown, máscaras
 * e mensagens de validação nunca chegavam ao work item.
 * @param {unknown} fields
 */
function uiFieldsTableHtml(fields) {
  const items = asObjArray(fields);
  if (!items.length) return '';
  const rows = items
    .map((f) => {
      const name = typeof f.name === 'string' ? f.name : '';
      const label = typeof f.label === 'string' ? f.label : '';
      const type = typeof f.type === 'string' ? f.type : '';
      const req = f.required === true ? 'Sim' : f.required === false ? 'Não' : '—';
      const dep = typeof f.dependsOn === 'string' ? f.dependsOn : '';
      const trace = typeof f.traceability === 'string' ? f.traceability : '';
      return (
        '<tr>' +
        `<td><code>${escapeHtml(name)}</code></td>` +
        `<td>${label ? textToInlineHtml(label) : '—'}</td>` +
        `<td>${type ? `<code>${escapeHtml(type)}</code>` : '—'}</td>` +
        `<td>${escapeHtml(req)}</td>` +
        `<td>${uiFieldOptionsCell(f)}</td>` +
        `<td>${uiFieldConstraintsCell(f)}</td>` +
        `<td>${uiFieldValidationsCell(f)}</td>` +
        `<td>${dep ? `<code>${escapeHtml(dep)}</code>` : '—'}</td>` +
        `<td>${trace ? `<code>${escapeHtml(trace)}</code>` : '—'}</td>` +
        '</tr>'
      );
    })
    .join('');
  return (
    `<h4><strong>Inventário de campos</strong></h4>` +
    `<table><thead><tr>` +
    `<th>Campo</th><th>Rótulo</th><th>Tipo</th><th>Obrigatório</th><th>Opções</th>` +
    `<th>Formato/limites</th><th>Validações</th><th>Depende de</th><th>Rastreio</th>` +
    `</tr></thead><tbody>${rows}</tbody></table>`
  );
}

/** Contrato de grid/listagem (uiContext.grid). @param {unknown} grid */
function uiGridHtml(grid) {
  if (!isObj(grid)) return '';
  const columns = asStrArray(grid.columns);
  const rowActions = asStrArray(grid.rowActions);
  const parts = [
    columns.length
      ? `<p><strong>Colunas (em ordem):</strong></p><ol>${columns.map((c) => `<li>${textToInlineHtml(c)}</li>`).join('')}</ol>`
      : '',
    typeof grid.defaultSort === 'string' && grid.defaultSort
      ? `<p><strong>Ordenação padrão:</strong> ${textToInlineHtml(grid.defaultSort)}</p>`
      : '',
    typeof grid.pagination === 'string' && grid.pagination
      ? `<p><strong>Paginação:</strong> ${textToInlineHtml(grid.pagination)}</p>`
      : '',
    rowActions.length
      ? `<p><strong>Ações por linha:</strong></p><ul>${rowActions.map((a) => `<li>${textToInlineHtml(a)}</li>`).join('')}</ul>`
      : '',
    typeof grid.emptyState === 'string' && grid.emptyState
      ? `<p><strong>Estado vazio:</strong> ${textToInlineHtml(grid.emptyState)}</p>`
      : '',
  ]
    .filter(Boolean)
    .join('');
  return parts ? `<h4><strong>Grid / listagem</strong></h4>${parts}` : '';
}

/** Comportamento do conjunto de filtros (uiContext.filterBehavior). @param {unknown} fb */
function uiFilterBehaviorHtml(fb) {
  if (!isObj(fb)) return '';
  const pairs = [
    ['Aplica em', typeof fb.applyOn === 'string' ? fb.applyOn : ''],
    ['Combinação', typeof fb.combination === 'string' ? fb.combination : ''],
    ['Limpar todos', fb.clearAll === true ? 'Sim' : fb.clearAll === false ? 'Não' : ''],
    ['Persistência', typeof fb.persistence === 'string' ? fb.persistence : ''],
    ['Notas', typeof fb.notes === 'string' ? fb.notes : ''],
  ]
    .filter(([, v]) => String(v).trim() !== '')
    .map(([k, v]) => `<p><strong>${escapeHtml(String(k))}:</strong> ${textToInlineHtml(v)}</p>`)
    .join('');
  return pairs ? `<h4><strong>Comportamento dos filtros</strong></h4>${pairs}` : '';
}

/**
 * Bloco "Contexto de UI" — renderiza o uiContext (tasks/v5.3) embutido pelo spec-tasks a partir
 * do flow-map: tela, rota, fluxo/etapa, estados de UI, regras, entidades, endpoints, o
 * INVENTÁRIO DE CAMPOS (`fields[]`), o contrato de `grid` e o `filterBehavior`.
 * O screenshot NÃO é renderizado aqui — o <img> é adicionado pelo serviço após o upload do
 * attachment (azureDevopsService.js) — e, conforme o schema, não substitui `fields[]`.
 * Função pura, exportada para teste.
 * @param {Record<string, unknown>} ui
 */
export function uiContextHtml(ui) {
  if (!isObj(ui)) return '';
  const tela = typeof ui.tela === 'string' ? ui.tela : '';
  const telaNome = typeof ui.telaNome === 'string' ? ui.telaNome : '';
  const rota = typeof ui.rota === 'string' ? ui.rota : '';
  const fluxo = typeof ui.fluxo === 'string' ? ui.fluxo : '';
  const etapa = typeof ui.etapa === 'string' ? ui.etapa : '';
  const estados = asStrArray(ui.estadosUI);
  const regras = asStrArray(ui.regras);
  const entidades = asStrArray(ui.entidades);
  const endpoints = asStrArray(ui.endpoints);
  if (!tela && !rota) return '';
  const parts = [
    tela ? `<p><strong>Tela:</strong> <code>${escapeHtml(tela)}</code>${telaNome ? ` — ${escapeHtml(telaNome)}` : ''}</p>` : '',
    rota ? `<p><strong>Rota:</strong> <code>${escapeHtml(rota)}</code></p>` : '',
    fluxo ? `<p><strong>Fluxo:</strong> ${escapeHtml(fluxo)}</p>` : '',
    etapa ? `<p><strong>Etapa:</strong> ${escapeHtml(etapa)}</p>` : '',
    estados.length
      ? `<p><strong>Estados UI:</strong></p><ul>${estados.map((e) => `<li>${textToInlineHtml(e)}</li>`).join('')}</ul>`
      : '',
    regras.length
      ? `<p><strong>Regras:</strong></p><ul>${regras.map((r) => `<li>${textToInlineHtml(r)}</li>`).join('')}</ul>`
      : '',
    entidades.length ? `<p><strong>Entidades:</strong> ${entidades.map((e) => escapeHtml(e)).join(', ')}</p>` : '',
    endpoints.length
      ? `<p><strong>Endpoints:</strong> ${endpoints.map((e) => `<code>${escapeHtml(e)}</code>`).join(', ')}</p>`
      : '',
    uiFieldsTableHtml(ui.fields),
    uiGridHtml(ui.grid),
    uiFilterBehaviorHtml(ui.filterBehavior),
  ]
    .filter(Boolean)
    .join('');
  return `<h3><strong>Contexto de UI</strong></h3>${parts}`;
}

/** @param {Record<string, unknown>} ui */
function legacyUiHtml(ui) {
  if (!isObj(ui)) return '';
  return `<h3><strong>Escopo de UI Legada</strong></h3><p><strong>Framework:</strong> ${escapeHtml(String(ui.frameworkOrLayer))}</p><p><strong>Expected:</strong> ${textToInlineHtml(ui.expectedBehavior)}</p>`;
}

function testScenariosGroup(title, scenarios) {
  if (!scenarios.length) return '';
  const lis = scenarios.map(s => {
    const id = s.id ? `<code>${escapeHtml(String(s.id))}</code> ` : '';
    const cat = s.category ? escapeHtml(String(s.category)) : '';
    const desc = s.description ? textToInlineHtml(s.description) : '';
    return `<li>${id}<strong>${cat}</strong>: ${desc}</li>`;
  }).join('');
  return `<h4><strong>${escapeHtml(title)}</strong></h4><ul>${lis}</ul>`;
}

/** @param {Record<string, unknown>} api */
function apiContractHtml(api) {
  if (!isObj(api)) return '';
  // v5.2 compact-prose: campos são strings ricas
  if (typeof api.request === 'string' || typeof api.responses === 'string' || typeof api.auth === 'string') {
    const opId = typeof api.operationId === 'string' ? api.operationId : '';
    const method = typeof api.method === 'string' ? api.method : '';
    const path = typeof api.path === 'string' ? api.path : '';
    const title = opId ? `Contrato API — ${opId}` : 'Contrato API';
    const methodLine = (method || path) ? `<p><strong>${escapeHtml(method)}</strong> <code>${escapeHtml(path)}</code></p>` : '';
    const auth = typeof api.auth === 'string' && api.auth ? `<p><strong>Auth:</strong> ${escapeHtml(api.auth)}</p>` : '';
    const req = typeof api.request === 'string' && api.request ? `<h4><strong>Requisição</strong></h4><pre${PRE_STYLE}><code>${escapeHtml(api.request)}</code></pre>` : '';
    const resp = typeof api.responses === 'string' && api.responses ? `<h4><strong>Respostas</strong></h4><pre${PRE_STYLE}><code>${escapeHtml(api.responses)}</code></pre>` : '';
    const pol = typeof api.policies === 'string' && api.policies ? `<p><strong>Políticas:</strong> ${textToInlineHtml(api.policies)}</p>` : '';
    return `<h3><strong>${escapeHtml(title)}</strong></h3>${methodLine}${auth}${req}${resp}${pol}`;
  }
  // v3/v4 com objetos
  const method = typeof api.method === 'string' ? api.method : '';
  const path = typeof api.path === 'string' ? api.path : '';
  const headers = asStrArray(api.mandatoryHeaders);
  const respErr = asObjArray(api.responseErrors);
  const httpSem = asObjArray(api.httpSemantics);
  const headList = headers.length
    ? `<p><strong>Headers obrigatórios</strong></p><ul>${headers.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
    : '';
  return `<h3><strong>Contrato API</strong></h3>
    <p><strong>${escapeHtml(method)}</strong> <code>${escapeHtml(path)}</code></p>
    ${headList}
    ${api.authScheme ? `<p><strong>Auth:</strong> ${escapeHtml(String(api.authScheme))}</p>` : ''}
    ${api.rateLimiting ? `<p><strong>Rate limit:</strong> ${escapeHtml(String(api.rateLimiting))}</p>` : ''}
    ${jsonPre('Exemplo requisição', api.requestExample)}
    ${jsonPre('Sucesso', api.responseSuccess)}
    ${jsonPre('Idempotente', api.responseIdempotent)}
    ${responseErrorsHtml(respErr)}
    ${httpSemanticsHtml(httpSem)}`;
}

/** @param {Record<string, unknown>} s */
function scenarioHtml(s) {
  const cat = typeof s.category === 'string' ? s.category : '';
  const sid = typeof s.id === 'string' ? s.id : '';
  const title = typeof s.title === 'string' ? s.title : '';
  const cov = s.coverageNote != null && String(s.coverageNote).trim() !== '' ? String(s.coverageNote) : '';
  const rules =
    Array.isArray(s.relatedRules) && s.relatedRules.length
      ? `<p><strong>Regras:</strong> ${s.relatedRules.map((r) => `<code>${escapeHtml(String(r))}</code>`).join(' ')}</p>`
      : '';
  
  let tdHtml = '';
  if (s.testData) {
    const tdStr = typeof s.testData === 'string' ? s.testData : JSON.stringify(s.testData, null, 2);
    tdHtml = `<p><strong>Dados:</strong></p><pre${PRE_STYLE}><code>${escapeHtml(tdStr)}</code></pre>`;
  }
  let vsHtml = '';
  const vSteps = asStrArray(s.verificationSteps);
  if (vSteps.length) {
    vsHtml = `<p><strong>Verificação:</strong></p><ol>${vSteps.map(v => `<li>${textToInlineHtml(v)}</li>`).join('')}</ol>`;
  }

  const headStr = [sid ? `<code>${escapeHtml(sid)}</code>` : '', cat, title].filter(Boolean).join(' · ');

  return `<div style="margin:0.75em 0;padding:0.5em;border-left:3px solid #ccc;">
    <p>${headStr || 'Cenário'}</p>
    <p><strong>Dado</strong> ${textToInlineHtml(s.given || '')}</p>
    <p><strong>Quando</strong> ${textToInlineHtml(s.when || '')}</p>
    <p><strong>Então</strong> ${textToInlineHtml(s.then || '')}</p>
    ${tdHtml}
    ${vsHtml}
    ${cov ? `<p><em>Cobertura:</em> ${textToInlineHtml(cov)}</p>` : ''}
    ${rules}
  </div>`;
}

/** @param {Record<string, unknown>} st */
function subtaskLine(st) {
  if (!isObj(st)) return `<li>${escapeHtml(JSON.stringify(st))}</li>`;
  const tid = typeof st.id === 'string' ? st.id : '';
  const tit = typeof st.title === 'string' ? st.title : '';
  const d = typeof st.description === 'string' ? st.description : '';
  if (tid || tit || d) {
    return `<li>${escapeHtml([tid, tit].filter(Boolean).join(' — '))}${d ? `: ${textToInlineHtml(d)}` : ''}</li>`;
  }
  let text;
  try {
    text = JSON.stringify(st);
  } catch {
    text = String(st);
  }
  return `<li><pre${PRE_STYLE}><code>${escapeHtml(text)}</code></pre></li>`;
}

/**
 * Narrativa de Epic (v5.3). Até aqui o publicador lia `epic.summary` — propriedade que
 * NÃO existe no schema v5.3 — e o épico chegava ao ADO com descrição vazia.
 * @param {Record<string, unknown>} epic
 */
export function buildEpicNarrativeHtml(epic) {
  if (!isObj(epic)) return '';
  const parts = [businessNarrativeHtml(epic.narrative, 'épico')];

  const exec = typeof epic.executiveSummary === 'string' ? epic.executiveSummary : '';
  if (exec) parts.push(`<h2><strong>Sumário executivo</strong></h2>${textToHtml(exec)}`);
  const probl = typeof epic.problemStatement === 'string' ? epic.problemStatement : '';
  if (probl) parts.push(`<p><strong>Problema:</strong> ${textToInlineHtml(probl)}</p>`);

  parts.push(bulletsHtml('Resultados de negócio', asStrArray(epic.businessOutcomes)));
  parts.push(bulletsHtml('Capacidades no escopo', asStrArray(epic.inScopeCapabilities)));
  parts.push(bulletsHtml('Fora de escopo', asStrArray(epic.outOfScope)));
  parts.push(bulletsHtml('Riscos de negócio', asStrArray(epic.businessRisks)));

  const metrics = asObjArray(epic.successMetrics);
  if (metrics.length) {
    parts.push(
      `<h2><strong>Métricas de sucesso</strong></h2><ul>${metrics
        .map((m) => {
          const name = typeof m.name === 'string' ? m.name : '';
          const target = m.target !== undefined ? String(m.target) : '';
          const base = m.baseline !== undefined ? String(m.baseline) : '';
          return `<li>${textToInlineHtml(name)}${target ? ` — <strong>meta:</strong> ${escapeHtml(target)}` : ''}${base ? ` (<em>baseline:</em> ${escapeHtml(base)})` : ''}</li>`;
        })
        .join('')}</ul>`
    );
  } else {
    parts.push(bulletsHtml('Métricas de sucesso', asStrArray(epic.successMetrics)));
  }

  const crit = normalizeCriteria(epic.acceptanceCriteria);
  if (crit.length) {
    parts.push(
      `<h2><strong>Critérios de aceite (épico)</strong></h2><ul>${crit
        .map((c) => `<li>${c.id ? `<code>${escapeHtml(c.id)}</code> — ` : ''}${textToInlineHtml(c.statement)}</li>`)
        .join('')}</ul>`
    );
  }

  const rules = asObjArray(epic.businessRules);
  if (rules.length) {
    parts.push(`<h2><strong>Regras de negócio (épico)</strong></h2><ul>${rules.map(businessRuleHtml).join('')}</ul>`);
  }

  // Escopo de módulos (`moduleScope[]`) e índice de filhos: sem estes blocos o Epic no ADO não
  // diz que parte do produto cobre nem o que contém — quem abre o cartão precisa navegar o board
  // para descobrir. `scopeBoundaries` é o par in/out consolidado pelo enriquecimento.
  parts.push(codeListHtml('Módulos no escopo', epic.moduleScope ?? epic.modules));
  const bounds = isObj(epic.scopeBoundaries) ? epic.scopeBoundaries : null;
  if (bounds) {
    parts.push(bulletsHtml('Fronteiras — no escopo', asStrArray(bounds.inScope)));
    parts.push(bulletsHtml('Fronteiras — fora do escopo', asStrArray(bounds.outOfScope)));
  }
  parts.push(codeListHtml('Features contidas', epic.containedFeatureIds));
  parts.push(codeListHtml('Histórias contidas', epic.containedStoryIds));
  parts.push(bulletsHtml('Stakeholders', asStrArray(epic.stakeholders)));
  parts.push(codeListHtml('Dependências', epic.dependencies));
  parts.push(traceabilityHtml(epic.traceability, 'Rastreabilidade (épico)'));
  parts.push(sourceRefsHtml(epic.sourceRefs));

  return parts.filter(Boolean).join('');
}

/**
 * Narrativa de Feature (v5.3). Idem Epic: `feat.summary` e `valueProposition` não existem
 * no schema v5.3 — a feature chegava ao ADO sem descrição.
 * @param {Record<string, unknown>} feature
 */
export function buildFeatureNarrativeHtml(feature) {
  if (!isObj(feature)) return '';
  const parts = [businessNarrativeHtml(feature.narrative, 'feature')];

  parts.push(bulletsHtml('Superfícies tocadas', asStrArray(feature.touchpoints)));

  const crit = normalizeCriteria(feature.acceptanceCriteria);
  if (crit.length) {
    parts.push(
      `<h2><strong>Critérios de aceite (feature)</strong></h2><ul>${crit
        .map((c) => `<li>${c.id ? `<code>${escapeHtml(c.id)}</code> — ` : ''}${textToInlineHtml(c.statement)}</li>`)
        .join('')}</ul>`
    );
  }

  const rules = asObjArray(feature.businessRules);
  if (rules.length) {
    parts.push(`<h2><strong>Regras de negócio (feature)</strong></h2><ul>${rules.map(businessRuleHtml).join('')}</ul>`);
  }

  // `moduleCode` é o vínculo da Feature com o catálogo de modules.md — é o que permite voltar do
  // cartão ao módulo de negócio que ele recorta.
  const moduleCode = typeof feature.moduleCode === 'string' ? feature.moduleCode : '';
  if (moduleCode) parts.push(`<p><strong>Módulo:</strong> <code>${escapeHtml(moduleCode)}</code></p>`);
  parts.push(codeListHtml('Histórias contidas', feature.containedStoryIds));
  parts.push(codeListHtml('Dependências', feature.dependencies));
  parts.push(traceabilityHtml(feature.traceability, 'Rastreabilidade (feature)'));
  parts.push(sourceRefsHtml(feature.sourceRefs));

  return parts.filter(Boolean).join('');
}

/**
 * Narrativa da User Story: negócio, rastreio, regras, riscos e índice das tarefas (sem o JSON completo das tasks).
 * @param {Record<string, unknown>} story
 */
export function buildStoryNarrativeHtml(story) {
  const parts = [];

  // v5.3: `narrative` é o carrier canônico e OBRIGATÓRIO em Epic/Feature/Story
  // (tasks.schema-atual.json). `businessSummary` é legado v5.0 ("Legado — preferir narrative").
  // Este renderer lia SÓ o legado: em backlogs v5.3 reais (narrative em 24/24 stories,
  // businessSummary em 0/24) a story chegava ao ADO sem uma linha de narrativa de negócio.
  parts.push(businessNarrativeHtml(story.narrative, 'história'));
  parts.push(userStoryHtml(story.userStory));

  const bs = isObj(story.businessSummary) ? story.businessSummary : null;
  if (bs) {
    const sac = Array.isArray(bs.storyAcceptanceCriteria) ? bs.storyAcceptanceCriteria.map(String) : [];
    const bflow = Array.isArray(bs.businessFlowSummary) ? bs.businessFlowSummary.map(String) : [];
    const flowText = bflow.length ? bflow.join(' → ') : '';
    const inner = [
      bs.problem ? `<p><strong>Problema:</strong> ${textToInlineHtml(bs.problem)}</p>` : '',
      bs.deliveredValue ? `<p><strong>Valor:</strong> ${textToInlineHtml(bs.deliveredValue)}</p>` : '',
      Array.isArray(bs.actors)
        ? `<p><strong>Atores:</strong> ${bs.actors.map((a) => escapeHtml(String(a))).join(', ')}</p>`
        : '',
      flowText ? `<p><strong>Fluxo (resumo):</strong> ${textToInlineHtml(flowText)}</p>` : '',
      sac.length
        ? `<h3><strong>Critérios de aceite (história)</strong></h3><ul>${sac.map((c) => `<li>${textToInlineHtml(c)}</li>`).join('')}</ul>`
        : '',
    ]
      .filter(Boolean)
      .join('');
    if (inner) parts.push(`<h2><strong>Negócio</strong></h2>${inner}`);
  }

  parts.push(traceabilityHtml(story.traceability, 'Rastreabilidade (história)'));
  parts.push(sourceRefsHtml(story.sourceRefs));

  // v5.3: acceptanceCriteria[] é o carrier canônico da story. DUAS formas aceitas — objetos
  // {id, statement} e STRINGS soltas. Ler só a forma objeto (via asObjArray) descartava a forma
  // string sem nenhum aviso, e o bloco de critérios não chegava ao ADO.
  const sCriteria = normalizeCriteria(story.acceptanceCriteria);
  if (sCriteria.length) {
    const lis = sCriteria
      .map((c) => `<li>${c.id ? `<code>${escapeHtml(c.id)}</code> — ` : ''}${textToInlineHtml(c.statement)}</li>`)
      .join('');
    if (lis) parts.push(`<h2><strong>Critérios de aceite (história)</strong></h2><ul>${lis}</ul>`);
  }

  const sbrules = asObjArray(story.businessRules);
  if (sbrules.length) {
    parts.push(`<h2><strong>Regras de negócio (história)</strong></h2><ul>${sbrules.map(businessRuleHtml).join('')}</ul>`);
  }

  parts.push(deliveryScopeHtml(story.deliveryScope));

  // Legado v5.0: acceptanceScenarios[] em story (GWT) — renderizar para não perder cenários
  // de arquivos antigos (em v5.3 os GWT vivem só em task.acceptanceScenarios[]).
  const sScenarios = asObjArray(story.acceptanceScenarios);
  if (sScenarios.length) {
    parts.push(`<h2><strong>Cenários de aceite (BDD — história)</strong></h2>${sScenarios.map(scenarioHtml).join('')}`);
  }

  if (isObj(story.uiContext)) parts.push(uiContextHtml(story.uiContext));

  parts.push(storyRisksHtml(Array.isArray(story.risks) ? story.risks : []));

  const tasks = asObjArray(story.tasks);
  if (tasks.length) {
    const lis = tasks
      .map((t) => {
        const tid = typeof t.id === 'string' ? t.id : '';
        const title = typeof t.title === 'string' ? t.title : tid;
        const seq = typeof t.sequence === 'number' ? t.sequence : '';
        const days = typeof t.durationEstimatedDays === 'number' ? `${t.durationEstimatedDays}d` : '';
        const owner = typeof t.owner === 'string' ? t.owner : '';
        const status = typeof t.status === 'string' ? t.status : '';
        const meta = [seq !== '' ? `#${seq}` : '', days, owner, status].filter(Boolean).join(' · ');
        return `<li><strong>${escapeHtml(tid)}</strong> — ${escapeHtml(title)}${meta ? ` <em>(${escapeHtml(meta)})</em>` : ''}</li>`;
      })
      .join('');
    parts.push(
      `<h2><strong>Tarefas planejadas</strong></h2><p>Detalhamento completo de cada tarefa está no work item filho correspondente.</p><ol>${lis}</ol>`
    );
  }

  return parts.filter(Boolean).join('');
}

/**
 * Narrativa completa da Task (equivalente ao corpo expandido do relatório HTML).
 * @param {Record<string, unknown>} task
 * @param {string} storyId
 */
export function buildTaskNarrativeHtml(task, storyId) {
  const parts = [];
  const desc = typeof task.description === 'string' ? task.description.trim() : '';
  if (desc) {
    parts.push(`<h2><strong>Descrição</strong></h2>${textToHtml(desc)}`);
  }

  parts.push(agentExecutionHtml(isObj(task.agentExecutionContext) ? task.agentExecutionContext : {}));

  const tac = asStrArray(task.taskAcceptanceCriteria);
  if (tac.length) {
    parts.push(
      `<h2><strong>Critérios de aceite (tarefa)</strong></h2><ul>${tac.map((s) => `<li>${textToInlineHtml(s)}</li>`).join('')}</ul>`
    );
  }

  parts.push(implementationStepsHtml(Array.isArray(task.implementationSteps) ? task.implementationSteps : []));

  const deps = asStrArray(task.dependencies);
  if (deps.length) {
    parts.push(
      `<h2><strong>Dependências</strong></h2><p>${deps.map((d) => `<code>${escapeHtml(d)}</code>`).join(', ')}</p>`
    );
  }

  parts.push(traceabilityHtml(task.traceability, 'Rastreabilidade'));

  const business = isObj(task.business) ? task.business : null;
  if (business) {
    const lines = [
      ['Objetivo', business.objective],
      ['Contexto', business.usageContext],
      ['Pré-condições', Array.isArray(business.preconditions) ? business.preconditions.join('; ') : ''],
      ['Pós-êxito', Array.isArray(business.successPostconditions) ? business.successPostconditions.join('; ') : ''],
      ['Racional', business.rationale],
    ];
    const actors = Array.isArray(business.actors) ? business.actors.map(String) : [];
    const oos = Array.isArray(business.outOfScopeForThisTask) ? business.outOfScopeForThisTask.map(String) : [];
    const flow = Array.isArray(business.businessFlowSteps)
      ? `<h3><strong>Fluxo de negócio</strong></h3><ol>${business.businessFlowSteps.map((s) => `<li>${textToInlineHtml(s)}</li>`).join('')}</ol>`
      : '';
    const body = [
      ...lines
        .filter(([, v]) => v)
        .map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${textToInlineHtml(v)}</p>`),
      actors.length ? `<p><strong>Atores:</strong> ${actors.map((a) => escapeHtml(a)).join(', ')}</p>` : '',
      flow,
      oos.length
        ? `<h3><strong>Fora do escopo desta tarefa</strong></h3><ul>${oos.map((x) => `<li>${textToInlineHtml(x)}</li>`).join('')}</ul>`
        : '',
    ]
      .filter(Boolean)
      .join('');
    if (body) parts.push(`<h2><strong>Negócio</strong></h2>${body}`);
  }

  const brules = asObjArray(task.businessRules);
  if (brules.length) {
    parts.push(`<h2><strong>Regras de negócio (tarefa)</strong></h2><ul>${brules.map(businessRuleHtml).join('')}</ul>`);
  }

  const trules = asObjArray(task.technicalRules);
  if (trules.length) {
    const lis = trules
      .map((t) => {
        const id = typeof t.id === 'string' ? t.id : '';
        const src = typeof t.sourceRule === 'string' ? t.sourceRule : '';
        const d = typeof t.description === 'string' ? t.description : '';
        const ex = typeof t.exactConstraint === 'string' ? t.exactConstraint : '';
        const app = typeof t.appliesTo === 'string' ? t.appliesTo : '';
        const vc = t.validationCommand != null && t.validationCommand !== '' ? String(t.validationCommand) : '';
        return `<li><p><code>${escapeHtml(id)}</code> (${escapeHtml(src)})</p><p>${textToInlineHtml(d)}</p>
          ${ex ? `<p><strong>Restrição exata:</strong> ${textToInlineHtml(ex)}</p>` : ''}
          ${app ? `<p><strong>Aplica-se a:</strong> ${escapeHtml(app)}</p>` : ''}
          ${vc ? `<p><strong>Validação:</strong> <code>${escapeHtml(vc)}</code></p>` : ''}</li>`;
      })
      .join('');
    parts.push(`<h2><strong>Regras técnicas</strong></h2><ul>${lis}</ul>`);
  }

  parts.push(existingCodeDiagnosisHtml(isObj(task.existingCodeDiagnosis) ? task.existingCodeDiagnosis : {}));
  parts.push(technicalContextHtml(isObj(task.technicalContext) ? task.technicalContext : {}));

  if (isObj(task.implementationGuidance)) parts.push(implementationGuidanceHtml(task.implementationGuidance));

  if (isObj(task.persistenceModel)) parts.push(persistenceModelHtml(task.persistenceModel));
  
  const asyncInts = asObjArray(task.asyncInterfaces);
  if (asyncInts.length) parts.push(asyncInterfacesHtml(asyncInts));
  
  if (isObj(task.legacyUiScope)) parts.push(legacyUiHtml(task.legacyUiScope));

  if (isObj(task.uiContext)) parts.push(uiContextHtml(task.uiContext));

  if (isObj(task.apiContract)) parts.push(apiContractHtml(task.apiContract));
  const apis = asObjArray(task.apiContracts);
  if (apis.length) parts.push(apis.map(apiContractHtml).join(''));

  const scenarios = asObjArray(task.acceptanceScenarios);
  if (scenarios.length) {
    parts.push(`<h2><strong>Cenários de aceite (BDD)</strong></h2>${scenarios.map(scenarioHtml).join('')}`);
  }

  parts.push(validationHtml(isObj(task.validation) ? task.validation : {}));

  const subtasks = asObjArray(task.subtasks);
  if (subtasks.length) {
    parts.push(`<h2><strong>Subtarefas</strong></h2><ul>${subtasks.map(subtaskLine).join('')}</ul>`);
  }

  parts.push(`<p><small>Story: <code>${escapeHtml(storyId)}</code></small></p>`);

  return parts.filter(Boolean).join('');
}
