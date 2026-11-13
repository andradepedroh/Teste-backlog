// Harness Elo v2 — A task no `tasks.json` e o que ela obriga a verificar. Núcleo puro, sem I/O.
//
// As perguntas de regra de negócio saem DAQUI, por código, a partir do que a `spec-tasks` gravou —
// nunca da leitura de quem implementou. É o que torna a validação independente: se o agente que
// escreveu o código também escrevesse as perguntas, ele corrigiria a própria prova com o próprio
// gabarito. Os nomes de campo são os de `.claude/skills/spec-tasks/templates/tasks.example-completo.json`.

const corta = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const lista = (v) => (Array.isArray(v) ? v : v ? [v] : []);

/**
 * A task pelo id, com a story a que pertence. Aceita o `tasks.json` da `spec-tasks`
 * (`stories[].tasks[]`) e o arquivo de task solta dos exemplos dela (a task na raiz).
 */
export function localizarTask(tasks, id) {
  for (const story of lista(tasks && tasks.stories)) {
    for (const task of lista(story.tasks)) if (task && task.id === id) return { task, story };
  }
  if (tasks && tasks.id === id) return { task: tasks, story: null };
  return null;
}

/** Regras de negócio da task e da story, sem repetir id. Story pode trazê-las como texto solto. */
export function regrasDeNegocio({ task, story }) {
  const vistas = new Map();
  const todas = [...lista(task && task.businessRules), ...lista(story && story.businessRules)];
  todas.forEach((r, i) => {
    const regra = typeof r === 'string'
      ? { id: (/^(RN[-\w]*)/.exec(r) || [])[1] || `RN-STORY-${i + 1}`, description: r }
      : r || {};
    const id = regra.id || `RN-${i + 1}`;
    if (!vistas.has(id)) vistas.set(id, { ...regra, id });
  });
  return [...vistas.values()];
}

/**
 * O que precisa ser verdade para a task estar certa, uma linha por item, com o id de origem.
 * O validador de regras de negócio responde CUMPRE / NAO_CUMPRE / INCERTO para cada uma.
 */
export function perguntasDeNegocio({ task, story }) {
  const perguntas = [];
  for (const r of regrasDeNegocio({ task, story })) {
    const onde = r.implementation && r.implementation.validationPoint
      ? ` Onde vale: ${corta(r.implementation.validationPoint, 160)}.` : '';
    perguntas.push({ id: r.id, origem: 'regra', texto: corta(`${r.title ? `${r.title}: ` : ''}${r.description || ''}`, 600) + onde });
  }
  for (const a of lista(task && task.acceptanceScenarios)) {
    const entao = lista(a.then).join('; ');
    perguntas.push({
      id: a.id,
      origem: `cenário ${a.category || ''}`.trim(),
      texto: corta(`Dado ${a.given || '—'}; quando ${a.when || '—'}; então ${entao || '—'}.`, 700),
    });
  }
  const tratamento = (task && task.implementationGuidance && task.implementationGuidance.errorHandling) || {};
  for (const [chave, eh] of Object.entries(tratamento)) {
    perguntas.push({ id: `EH-${chave}`, origem: 'tratamento de erro', texto: corta(`${eh.scenario || chave} → ${eh.action || ''}`, 400) });
  }
  const ui = (task && task.uiContext) || {};
  lista(ui.estadosUI).forEach((e, i) => {
    perguntas.push({ id: `UI-${i + 1}`, origem: 'estado de tela', texto: corta(`A tela ${ui.rota || ''} tem o estado: ${e}`, 300) });
  });
  for (const c of lista(task && task.apiContracts)) {
    const assinatura = c.signature || `${c.method || ''} ${c.path || ''}`.trim();
    perguntas.push({
      id: `API-${assinatura}`,
      origem: 'contrato de API',
      texto: corta(`${assinatura} responde como declarado: ${c.responses || c.summary || ''}`, 600),
    });
  }
  lista(task && task.validation && task.validation.businessCriteria).forEach((c, i) => {
    perguntas.push({ id: `CN-${i + 1}`, origem: 'critério de negócio', texto: corta(c, 300) });
  });
  return perguntas;
}

/** Mensagens de erro documentadas nas regras — conferidas por código no `deterministico.mjs`. */
export function mensagensDeErro({ task, story }) {
  const saida = [];
  for (const r of regrasDeNegocio({ task, story })) {
    const msgs = (r.implementation && r.implementation.errorMessages) || {};
    for (const [chave, texto] of Object.entries(msgs)) saida.push({ chave, texto: String(texto), regra: r.id });
  }
  return saida;
}

/** A task tem algo de negócio para validar? Sem isso, a dimensão de regras de negócio é dispensada. */
export function temRegraDeNegocio(par) {
  return perguntasDeNegocio(par).length > 0;
}
