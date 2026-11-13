/**
 * Resolve backlog hierarchy and ADO WIT mapping from optional Azure template JSON.
 */

const BACKLOG_WIT_ALIASES = {
  epic: ['Epic'],
  feature: ['Feature'],
  story: ['User Story', 'Product Backlog Item', 'PBI'],
  task: ['Task', 'Sub-task', 'Sub_task', 'Sub_bug']
};

// Mapeia `story.workItemType` / `feature.workItemType` (EloCore § 3) para o nome do WIT no
// template Azure e para o rótulo default usado quando não há template (ver EloCore § 3.4-3.7).
// USER_STORY/FEATURE não entram aqui: seguem BACKLOG_WIT_ALIASES (mapeamento por nível).
const OPERATIONAL_WIT_ALIASES = {
  ENABLER: { aliases: ['Enabler'], defaultLabel: 'Enabler' },
  SPIKE: { aliases: ['Spike', 'Enabler'], defaultLabel: 'Spike' },
  TECHNICAL_DEBT: { aliases: ['Technical Debt', 'Enabler'], defaultLabel: 'Technical Debt' },
  BUG: { aliases: ['Bug'], defaultLabel: 'Bug' }
};

/**
 * Resolve o WIT de um item operacional (Story ou Feature de nível 2) pelo seu `workItemType`.
 * Sem template (ou tipo não encontrado nele), cai no `defaultLabel` — assim `adoWorkItemType`
 * fica preenchido mesmo em projetos sem `azureTemplate`.
 * @param {string} workItemType - ENABLER | SPIKE | TECHNICAL_DEBT | BUG
 * @param {Set<string>} names - nomes de WIT habilitados no template (pode ser vazio)
 * @param {object[]} enabled - work item types habilitados do template (pode ser vazio)
 */
function resolveOperationalWit(workItemType, names, enabled) {
  const entry = OPERATIONAL_WIT_ALIASES[workItemType];
  if (!entry) return null;
  const match = entry.aliases.find((a) => names.has(a));
  if (!match) return { wit: entry.defaultLabel, referenceName: null, requiredFields: [] };
  const wit = enabled.find((w) => w.name === match);
  return {
    wit: match,
    referenceName: wit?.referenceName ?? null,
    requiredFields: (wit?.fields ?? [])
      .filter((f) => f.required)
      .map((f) => ({ name: f.name, referenceName: f.referenceName, defaultValue: f.defaultValue }))
  };
}

/**
 * @param {object|null} azureTemplate
 * @returns {{ chosen: string[], workItemTypes: object, processTemplateName: string, azureTemplateMeta: object }}
 */
export function resolveBacklogFromAzureTemplate(azureTemplate) {
  if (!azureTemplate?.workItemTypes?.length) {
    return null;
  }

  const enabled = azureTemplate.workItemTypes.filter((w) => !w.isDisabled);
  const names = new Set(enabled.map((w) => w.name));

  const chosen = [];
  for (const [level, aliases] of Object.entries(BACKLOG_WIT_ALIASES)) {
    if (aliases.some((a) => names.has(a))) {
      chosen.push(level);
    }
  }

  if (!chosen.includes('story') && !chosen.includes('task')) {
    chosen.push('story', 'task');
  }

  const workItemTypes = {};
  for (const level of ['epic', 'feature', 'story', 'task']) {
    const match = BACKLOG_WIT_ALIASES[level].find((a) => names.has(a));
    if (match) {
      const wit = enabled.find((w) => w.name === match);
      workItemTypes[level] = {
        wit: match,
        publish: true,
        referenceName: wit?.referenceName ?? null,
        requiredFields: (wit?.fields ?? [])
          .filter((f) => f.required)
          .map((f) => ({ name: f.name, referenceName: f.referenceName, defaultValue: f.defaultValue }))
      };
    }
  }

  return {
    chosen,
    workItemTypes,
    processTemplateName: azureTemplate.processTemplate?.templateName ?? 'Custom',
    azureTemplateMeta: {
      displayName: azureTemplate.metadata?.displayName,
      targetProvider: azureTemplate.metadata?.targetProvider ?? 'azuredevops',
      processTemplateName: azureTemplate.processTemplate?.templateName
    }
  };
}

/**
 * Preenche `adoWorkItemType` de Features (nível 2 Enabler) e Stories cujo `workItemType` seja
 * ENABLER/SPIKE/TECHNICAL_DEBT/BUG. Independente de haver `azureTemplate`: sem template, usa o
 * `defaultLabel` de `OPERATIONAL_WIT_ALIASES` — assim o work item type sai preenchido mesmo em
 * projetos sem blueprint Azure. USER_STORY/FEATURE (default) não são tocados aqui: seguem o
 * mapeamento por nível já resolvido por `resolveBacklogFromAzureTemplate`.
 * @param {object} doc - tasks.json root
 * @param {object|null} azureTemplate
 */
function applyOperationalWitDefaults(doc, azureTemplate) {
  const enabled = (azureTemplate?.workItemTypes ?? []).filter((w) => !w.isDisabled);
  const names = new Set(enabled.map((w) => w.name));
  for (const feature of doc.features ?? []) {
    if (feature?.workItemType && feature.workItemType !== 'FEATURE') {
      const resolvedWit = resolveOperationalWit(feature.workItemType, names, enabled);
      if (resolvedWit) feature.adoWorkItemType = resolvedWit.wit;
    }
  }
  for (const story of doc.stories ?? []) {
    if (story?.workItemType && story.workItemType !== 'USER_STORY') {
      const resolvedWit = resolveOperationalWit(story.workItemType, names, enabled);
      if (resolvedWit) story.adoWorkItemType = resolvedWit.wit;
    }
  }
}

/**
 * @param {object} doc - tasks.json root
 * @param {object|null} azureTemplate
 */
export function applyAzureTemplateToMetadata(doc, azureTemplate, sourcePath = null) {
  const resolved = resolveBacklogFromAzureTemplate(azureTemplate);
  if (!resolved) {
    applyOperationalWitDefaults(doc, azureTemplate);
    return doc;
  }

  doc.metadata = doc.metadata ?? {};
  doc.metadata.backlogHierarchy = {
    ...doc.metadata.backlogHierarchy,
    chosen: resolved.chosen,
    rationale:
      doc.metadata.backlogHierarchy?.rationale ??
      `Hierarquia derivada do template Azure: ${resolved.azureTemplateMeta.displayName ?? resolved.processTemplateName}`,
    decidedBy: 'agent',
    decidedAt: new Date().toISOString()
  };
  doc.metadata.azureTemplate = {
    sourcePath,
    ...resolved.azureTemplateMeta
  };
  doc.metadata.azureDevOps = {
    ...doc.metadata.azureDevOps,
    processTemplateName: 'Custom',
    workItemTypes: resolved.workItemTypes
  };

  const witMap = resolved.workItemTypes;
  for (const epic of doc.epics ?? []) {
    if (witMap.epic) epic.adoWorkItemType = witMap.epic.wit;
  }
  for (const feature of doc.features ?? []) {
    if (witMap.feature && (!feature.workItemType || feature.workItemType === 'FEATURE')) {
      feature.adoWorkItemType = witMap.feature.wit;
    }
  }
  for (const story of doc.stories ?? []) {
    if (witMap.story && (!story.workItemType || story.workItemType === 'USER_STORY')) {
      story.adoWorkItemType = witMap.story.wit;
    }
    for (const task of story.tasks ?? []) {
      if (witMap.task) task.adoWorkItemType = witMap.task.wit;
    }
  }
  applyOperationalWitDefaults(doc, azureTemplate);

  return doc;
}
