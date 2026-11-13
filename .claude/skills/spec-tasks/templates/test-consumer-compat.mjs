#!/usr/bin/env node
/**
 * test-consumer-compat.mjs — teste de RETROCOMPATIBILIDADE de CONSUMIDOR.
 *
 * Roda os consumidores reais (spec-tasks-html/lib/render-html.mjs e
 * spec-tasks-azure/lib/ado-narrative-html.mjs) sobre `tasks.fixture-compat.json` e afirma que
 * TODA forma de cada chave divergente produz saída legível — nenhuma cai em branco.
 *
 * POR QUE NÃO BASTA O SCHEMA: as quatro perdas silenciosas que motivaram este teste eram todas
 * VÁLIDAS contra o schema. `traceability` como objeto é válido e era descartado; `title` em vez
 * de `name` era tolerado e publicava "<id>: <id>"; `acceptanceCriteria[{id,statement}]` era
 * válido e o campo do ADO saía vazio. Conformidade de forma não prova que o conteúdo chega ao
 * outro lado — só a asserção sobre a SAÍDA do consumidor prova.
 *
 * Uso:  node test-consumer-compat.mjs [caminho-do-fixture]
 * Exit: 0 se todas as asserções passam; 1 se qualquer conteúdo esperado não aparece na saída.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = path.resolve(__dirname, '../..');
const fixturePath = path.resolve(process.argv[2] ?? path.join(__dirname, 'tasks.fixture-compat.json'));

/** Resolve um módulo de skill irmã. Sem isto o teste ficaria acoplado a um layout de disco. */
function siblingUrl(rel) {
  const abs = path.join(SKILLS_ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return new URL(`file://${abs.replace(/\\/g, '/')}`).href;
}

let failures = 0;
let checks = 0;

function assertIncludes(haystack, needle, label) {
  checks++;
  if (typeof haystack === 'string' && haystack.includes(needle)) {
    console.log(`OK   ${label}`);
    return;
  }
  failures++;
  console.error(`FALHA ${label}`);
  console.error(`      esperado encontrar: "${String(needle).slice(0, 120)}"`);
}

function assertNotIncludes(haystack, needle, label) {
  checks++;
  if (typeof haystack !== 'string' || !haystack.includes(needle)) {
    console.log(`OK   ${label}`);
    return;
  }
  failures++;
  console.error(`FALHA ${label}`);
  console.error(`      NÃO deveria aparecer: "${String(needle).slice(0, 120)}"`);
}

console.log(`\nFixture: ${fixturePath}\n`);

// ---------------------------------------------------------------------------
// 1. Loader + normalização de rótulo (`name` ?? `title` ?? `id`)
// ---------------------------------------------------------------------------
const htmlLoader = siblingUrl('spec-tasks-html/lib/load-tasks.mjs');
const azureLoader = siblingUrl('spec-tasks-azure/lib/load-tasks.mjs');

for (const [label, url] of [['spec-tasks-html', htmlLoader], ['spec-tasks-azure', azureLoader]]) {
  if (!url) {
    console.log(`SKIP ${label}/lib/load-tasks.mjs não encontrado (skill ausente neste layout)`);
    continue;
  }
  const { loadTasksDocument } = await import(url);
  const doc = loadTasksDocument(fixturePath);
  const epicB = (doc.epics ?? []).find((e) => e.id === 'EPIC-B');
  const storyB = (doc.stories ?? []).find((s) => s.id === 'STORY-B');
  const featB = (doc.features ?? []).find((f) => f.id === 'FEAT-B');
  assertIncludes(epicB?.name, 'Relatórios do catálogo', `${label}: EPIC-B só com \`title\` → name normalizado`);
  assertIncludes(storyB?.name, 'Corrigir a descrição', `${label}: STORY-B só com \`title\` → name normalizado`);
  assertIncludes(featB?.name, 'Retirada de item', `${label}: FEAT-B só com \`title\` → name normalizado`);
}

// ---------------------------------------------------------------------------
// 2. spec-tasks-html — render completo
// ---------------------------------------------------------------------------
const htmlRenderUrl = siblingUrl('spec-tasks-html/lib/render-html.mjs');
if (htmlRenderUrl && htmlLoader) {
  const { loadTasksDocument } = await import(htmlLoader);
  const mod = await import(htmlRenderUrl);
  const render = mod.renderTasksHtml ?? mod.renderHtml ?? mod.default;
  const doc = loadTasksDocument(fixturePath);
  if (typeof render !== 'function') {
    console.log('SKIP spec-tasks-html: nenhuma função de render exportada com nome conhecido');
  } else {
    // Desde a v6.1 o HTML renderiza a cadeia COMPLETA Epic → Feature → Story → Task. Até a v6.0
    // `doc.features[]` era ignorado (o cli.mjs avisava em stderr e seguia), e num backlog com 1
    // Epic + 9 Features o relatório saía com as stories achatadas num cartão só e sem nenhum
    // bloco de negócio de módulo. As asserções de Feature abaixo existem para que isso não volte.
    const html = render(doc, { baseDir: __dirname });
    // Rótulo humano no CORPO da story (o defeito era o corpo mostrar só o ID)
    assertIncludes(html, 'Corrigir a descrição de um item já publicado', 'HTML: título da story vindo de `title`');
    assertIncludes(html, 'Cadastrar um item novo no catálogo', 'HTML: título da story vindo de `name`');
    // acceptanceCriteria nas três formas
    assertIncludes(html, 'o item passa a aparecer na listagem do catálogo', 'HTML: critério em OBJETO {id,statement}');
    assertIncludes(html, 'A tentativa de alterar o código de um item em circulação é recusada', 'HTML: critério em STRING');
    assertIncludes(html, 'Item retirado deixa de aparecer na listagem', 'HTML: critério legado em businessSummary');
    // traceability nas duas formas
    assertIncludes(html, 'RF-CAT-001', 'HTML: traceability em OBJETO (story A)');
    assertIncludes(html, 'RF-CAT-002', 'HTML: traceability em ARRAY (story B)');
    assertIncludes(html, 'Origem na especificação', 'HTML: painel de sourceRefs renderizado');
    // narrativa legado (story sem `narrative`, só `businessSummary`)
    assertIncludes(html, 'Item descontinuado continua aparecendo na listagem', 'HTML: narrativa legado (businessSummary)');
    // nenhum rótulo degenerado "<id>: <id>"
    assertNotIncludes(html, 'STORY-B: STORY-B', 'HTML: sem rótulo degenerado "<id>: <id>"');

    // ---- Nível Feature no HTML (v6.1) -------------------------------------
    assertIncludes(html, 'id="feature-feat-a"', 'HTML: âncora do cartão de Feature');
    assertIncludes(html, 'FEAT-A — Manutenção de item</h4>', 'HTML: cabeçalho da Feature com id + nome');
    assertIncludes(html, 'Retirada de item de circulação', 'HTML: Feature só com `title` renderiza o rótulo humano');
    assertNotIncludes(html, 'FEAT-B — FEAT-B', 'HTML: Feature sem `name` não cai em "<id> — <id>"');
    assertIncludes(html, 'Narrativa da feature', 'HTML: rótulo de narrativa sensível ao nível (feature)');
    assertIncludes(html, 'Narrativa do épico', 'HTML: rótulo de narrativa do épico preservado');
    assertIncludes(html, 'tree-feature', 'HTML: árvore da barra lateral tem o nível Feature');
    assertIncludes(html, 'Epic → Feature → Story → Task', 'HTML: rótulo da cadeia vem de backlogHierarchy.chosen');
    assertIncludes(html, 'MOD-CAT', 'HTML: moduleCode da Feature no cartão');
    assertNotIncludes(html, 'Stories sem Epic', 'HTML: nenhuma story cai em órfã quando o vínculo existe');

    // ---- Campos que existiam no JSON e sumiam no HTML (Parte C) -----------
    assertIncludes(html, 'Restrições de unicidade', 'HTML: bloco de uniqueConstraints');
    assertIncludes(html, 'UK_ITEM_CATALOGO_CD (cd_item)', 'HTML: conteúdo de uniqueConstraints (string pipe-separated)');
    assertIncludes(html, 'UK_ITEM_CATALOGO_DS_CAT (ds_item, ds_categoria)', 'HTML: 2º segmento de uniqueConstraints');
    assertIncludes(html, 'Restrições de verificação', 'HTML: bloco de checkConstraints');
    assertIncludes(html, 'CK_ITEM_CATALOGO_CATEGORIA', 'HTML: conteúdo de checkConstraints (array de strings)');
    assertIncludes(html, 'CK_ITEM_CATALOGO_SITUACAO', 'HTML: 2º item de checkConstraints');
    assertIncludes(html, 'Notas de migração', 'HTML: bloco de migrationNotes');
    assertIncludes(html, 'deixa a janela de duplicidade aberta em produção', 'HTML: conteúdo de migrationNotes');
    assertIncludes(html, 'api-contract__tags', 'HTML: tags[] da operação renderizadas');
    assertIncludes(html, '>Catálogo<', 'HTML: valor de tags[0]');
    assertIncludes(html, '>Manutenção de item<', 'HTML: valor de tags[1]');

    // ---- Rede contra repetição: chave presente e não renderizada ----------
    if (typeof mod.getUnrenderedKeyWarnings === 'function') {
      const warns = mod.getUnrenderedKeyWarnings();
      // O fixture é CORRETO: nenhuma chave dele pode ficar de fora.
      checks++;
      if (!warns.length) console.log('OK   HTML: nenhuma chave do fixture ficou sem renderização');
      else {
        failures++;
        console.error(`FALHA HTML: ${warns.length} chave(s) do fixture não renderizada(s)`);
        warns.slice(0, 8).forEach((w) => console.error(`      ${w.scope}.${w.path}.${w.key}`));
      }
      // E a rede tem de FUNCIONAR — chave inventada precisa ser detectada. Sem esta metade, um
      // detector quebrado (que nunca acusa nada) passaria como "está tudo renderizado".
      const probe = structuredClone(doc);
      for (const s of probe.stories ?? []) {
        for (const t of s.tasks ?? []) {
          for (const e of t.persistenceModel?.entities ?? []) e.campoQueNinguemRenderiza = 'valor não vazio';
          for (const a of t.apiContracts ?? []) a.outroCampoNaoRenderizado = 'valor não vazio';
        }
      }
      render(probe, { baseDir: __dirname });
      const probeWarns = mod.getUnrenderedKeyWarnings();
      assertIncludes(
        probeWarns.map((w) => `${w.path}.${w.key}`).join(' '),
        'campoQueNinguemRenderiza',
        'HTML: rede detecta chave de entidade presente e não renderizada'
      );
      assertIncludes(
        probeWarns.map((w) => `${w.path}.${w.key}`).join(' '),
        'outroCampoNaoRenderizado',
        'HTML: rede detecta chave de contrato presente e não renderizada'
      );
      // Restaura o estado do render para o fixture original (o coletor é por execução).
      render(doc, { baseDir: __dirname });
    } else {
      console.log('SKIP spec-tasks-html: getUnrenderedKeyWarnings não exportado (versão < 6.1)');
    }

    // ---- Casos degenerados da hierarquia (nenhum pode perder conteúdo) ----
    const degenerate = [
      {
        label: 'Epic sem Feature — stories penduradas direto no épico',
        doc: {
          metadata: { projectName: 'deg-1', backlogHierarchy: { chosen: ['epic', 'feature', 'story', 'task'] } },
          epics: [{ id: 'E1', name: 'Épico com feature', containedFeatureIds: ['F1'] }, { id: 'E2', name: 'Épico sem feature' }],
          features: [{ id: 'F1', name: 'Feature do E1', epicId: 'E1' }],
          stories: [
            { id: 'S1', name: 'Story da feature', epicId: 'E1', featureId: 'F1', tasks: [{ id: 'T1', title: 'Task 1' }] },
            { id: 'S2', name: 'Story direta no épico dois', epicId: 'E2', tasks: [{ id: 'T2', title: 'Task 2' }] }
          ]
        },
        expect: ['id="feature-f1"', 'Story da feature', 'Story direta no épico dois', 'E2 — Épico sem feature'],
        reject: ['Stories sem Epic', 'Features sem Epic']
      },
      {
        label: 'Feature sem Epic — bloco próprio, stories preservadas',
        doc: {
          metadata: { projectName: 'deg-2', backlogHierarchy: { chosen: ['epic', 'feature', 'story', 'task'] } },
          epics: [{ id: 'E1', name: 'Único épico' }],
          features: [{ id: 'F9', name: 'Feature sem épico' }],
          stories: [{ id: 'S9', name: 'Story da feature sem épico', featureId: 'F9', tasks: [{ id: 'T9', title: 'Task 9' }] }]
        },
        expect: ['Features sem Epic', 'id="feature-f9"', 'Story da feature sem épico'],
        reject: ['Stories sem Epic']
      },
      {
        label: 'story com featureId inexistente — cai no épico, não em órfã',
        doc: {
          metadata: { projectName: 'deg-3', backlogHierarchy: { chosen: ['epic', 'feature', 'story', 'task'] } },
          epics: [{ id: 'E1', name: 'Épico único' }],
          features: [{ id: 'F1', name: 'Feature existente', epicId: 'E1' }],
          stories: [{ id: 'S1', name: 'Story com vínculo quebrado', epicId: 'E1', featureId: 'F-NAO-EXISTE', tasks: [{ id: 'T1', title: 'Task 1' }] }]
        },
        expect: ['Story com vínculo quebrado', 'E1 — Épico único'],
        reject: ['Stories sem Epic']
      },
      {
        label: 'story sem featureId em documento com features — cai no épico',
        doc: {
          metadata: { projectName: 'deg-4', backlogHierarchy: { chosen: ['epic', 'feature', 'story', 'task'] } },
          epics: [{ id: 'E1', name: 'Épico único', containedFeatureIds: ['F1'] }],
          features: [{ id: 'F1', name: 'Feature existente', epicId: 'E1' }],
          stories: [{ id: 'S1', name: 'Story sem featureId', epicId: 'E1', tasks: [{ id: 'T1', title: 'Task 1' }] }]
        },
        expect: ['Story sem featureId', 'id="feature-f1"'],
        reject: ['Stories sem Epic']
      },
      {
        label: 'story realmente sem vínculo — aí SIM é órfã',
        doc: {
          metadata: { projectName: 'deg-5', backlogHierarchy: { chosen: ['epic', 'feature', 'story', 'task'] } },
          epics: [{ id: 'E1', name: 'Épico único' }],
          features: [{ id: 'F1', name: 'Feature existente', epicId: 'E1' }],
          stories: [{ id: 'S1', name: 'Story sem pai algum', tasks: [{ id: 'T1', title: 'Task 1' }] }]
        },
        expect: ['Stories sem Epic', 'Story sem pai algum'],
        reject: []
      },
      {
        label: 'Feature → Story → Task (documento sem epics)',
        doc: {
          metadata: { projectName: 'deg-6', backlogHierarchy: { chosen: ['feature', 'story', 'task'] } },
          features: [{ id: 'F1', name: 'Feature raiz' }],
          stories: [{ id: 'S1', name: 'Story da feature raiz', featureId: 'F1', tasks: [{ id: 'T1', title: 'Task 1' }] }]
        },
        expect: ['id="feature-f1"', 'Story da feature raiz', 'Feature → Story → Task'],
        reject: ['Stories sem Epic', 'Features sem Epic']
      }
    ];

    for (const c of degenerate) {
      let out = '';
      try {
        out = render(c.doc, { baseDir: __dirname });
      } catch (e) {
        checks++;
        failures++;
        console.error(`FALHA degenerado (exceção) — ${c.label}: ${e?.message || e}`);
        continue;
      }
      for (const needle of c.expect) assertIncludes(out, needle, `degenerado [${c.label}] → contém "${needle}"`);
      for (const needle of c.reject) assertNotIncludes(out, needle, `degenerado [${c.label}] → NÃO contém "${needle}"`);
      // Nenhuma task pode desaparecer da árvore, em nenhum caso.
      const nTasks = (c.doc.stories ?? []).reduce((a, s) => a + (s.tasks ?? []).length, 0);
      const rendered = (out.match(/id="task-[a-z0-9-]+"/g) ?? []).length;
      checks++;
      if (rendered >= nTasks) console.log(`OK   degenerado [${c.label}] → ${rendered}/${nTasks} task(s) no documento`);
      else {
        failures++;
        console.error(`FALHA degenerado [${c.label}] → só ${rendered} de ${nTasks} task(s) renderizada(s)`);
      }
    }
  }
} else {
  console.log('SKIP spec-tasks-html não encontrado neste layout');
}

// ---------------------------------------------------------------------------
// 3. spec-tasks-azure — builders de narrativa (sem rede: só o HTML do payload)
// ---------------------------------------------------------------------------
const adoUrl = siblingUrl('spec-tasks-azure/lib/ado-narrative-html.mjs');
if (adoUrl && azureLoader) {
  const { loadTasksDocument } = await import(azureLoader);
  const ado = await import(adoUrl);
  const doc = loadTasksDocument(fixturePath);
  const byId = (list, id) => (list ?? []).find((x) => x.id === id);

  const storyA = byId(doc.stories, 'STORY-A');
  const storyB = byId(doc.stories, 'STORY-B');
  const storyC = byId(doc.stories, 'STORY-C');
  const epicA = byId(doc.epics, 'EPIC-A');
  const epicB = byId(doc.epics, 'EPIC-B');
  const featA = byId(doc.features, 'FEAT-A');
  const featB = byId(doc.features, 'FEAT-B');

  const hA = ado.buildStoryNarrativeHtml(storyA);
  const hB = ado.buildStoryNarrativeHtml(storyB);
  const hC = ado.buildStoryNarrativeHtml(storyC);
  const hEA = ado.buildEpicNarrativeHtml(epicA);
  const hEB = ado.buildEpicNarrativeHtml(epicB);
  const hFA = ado.buildFeatureNarrativeHtml(featA);
  const hFB = ado.buildFeatureNarrativeHtml(featB);

  // narrative (v5.3) e businessSummary (legado v5.0) — ambos precisam sair
  assertIncludes(hA, 'Negócio (história)', 'ADO: story com `narrative` → bloco de negócio');
  assertIncludes(hC, 'Item descontinuado continua aparecendo', 'ADO: story legado (businessSummary) → bloco de negócio');

  // acceptanceCriteria: objeto, string e legado
  assertIncludes(hA, 'o item passa a aparecer na listagem do catálogo', 'ADO: critério em OBJETO no corpo');
  assertIncludes(hB, 'A tentativa de alterar o código', 'ADO: critério em STRING no corpo');
  assertIncludes(hC, 'Item retirado deixa de aparecer na listagem', 'ADO: critério legado no corpo');

  // traceability: OBJETO (o caso que era descartado) e ARRAY (comportamento anterior)
  assertIncludes(hA, 'Rastreabilidade (história)', 'ADO: bloco de rastreabilidade presente (objeto)');
  assertIncludes(hA, 'Requisito funcional (RF)', 'ADO: traceability OBJETO → par chave/valor legível');
  assertIncludes(hA, 'RF-CAT-001', 'ADO: valor do traceability objeto no corpo');
  assertIncludes(hB, 'RF-CAT-002', 'ADO: traceability ARRAY preservado');
  assertIncludes(hA, 'Origem na especificação', 'ADO: bloco de sourceRefs presente');

  // Epic e Feature: builders próprios (antes não existiam e a Description saía vazia)
  assertIncludes(hEA, 'Negócio (épico)', 'ADO: Epic com narrativa');
  assertIncludes(hEA, 'Métricas de sucesso', 'ADO: Epic → successMetrics');
  assertIncludes(hEA, 'Módulos no escopo', 'ADO: Epic → moduleScope');
  assertIncludes(hEA, 'MOD-CAT', 'ADO: Epic → código de módulo no corpo');
  assertIncludes(hEB, 'Negócio (épico)', 'ADO: Epic só com `title` → narrativa mesmo assim');
  // O rótulo humano do Epic entra pela Description COMPLETA (buildEpicDescriptionHtml recebe
  // `title` e o renderiza no cabeçalho), não pelo builder de narrativa. Testar aqui é o que
  // prova que um Epic sem `name` publica com o título legível e não com o id.
  const svc = siblingUrl('spec-tasks-azure/azureDevopsService.js');
  if (svc) {
    const { buildEpicDescriptionHtml, buildFeatureDescriptionHtml } = await import(svc);
    const descEB = buildEpicDescriptionHtml({ epic: epicB, title: `${epicB.id}: ${epicB.name}` });
    assertIncludes(descEB, 'Relatórios do catálogo', 'ADO: Description do Epic traz o título vindo de `title`');
    assertNotIncludes(descEB, 'EPIC-B: EPIC-B', 'ADO: Description do Epic sem rótulo degenerado "<id>: <id>"');
    const descFB = buildFeatureDescriptionHtml({ feature: featB, title: `${featB.id}: ${featB.name}` });
    assertIncludes(descFB, 'Retirada de item de circulação', 'ADO: Description da Feature traz o título vindo de `title`');
  } else {
    console.log('SKIP spec-tasks-azure/azureDevopsService.js não encontrado neste layout');
  }
  assertIncludes(hFA, 'Negócio (feature)', 'ADO: Feature com narrativa');
  assertIncludes(hFA, 'Superfícies tocadas', 'ADO: Feature → touchpoints');
  assertIncludes(hFA, 'Módulo:', 'ADO: Feature → moduleCode');
  assertIncludes(hFA, 'Histórias contidas', 'ADO: Feature → containedStoryIds');
  // FEAT-B é title-only: sem narrativa, mas o índice de filhos ainda sai (não pode dar erro)
  assertIncludes(hFB, 'STORY-C', 'ADO: Feature title-only → índice de filhos ainda renderiza');

  // Task: traceability em ARRAY (TASK-A-01) e em OBJETO (TASK-B-01)
  const tA = ado.buildTaskNarrativeHtml(storyA.tasks[0], storyA.id);
  const tB = ado.buildTaskNarrativeHtml(storyB.tasks[0], storyB.id);
  assertIncludes(tA, 'O sistema deve permitir cadastrar um item', 'ADO: task traceability ARRAY → excerpt no corpo');
  assertIncludes(tB, 'Requisito funcional (RF)', 'ADO: task traceability OBJETO → par chave/valor legível');
  assertIncludes(tB, 'RF-CAT-002', 'ADO: task traceability OBJETO → valor no corpo');
} else {
  console.log('SKIP spec-tasks-azure não encontrado neste layout');
}

console.log(`\n${checks} asserção(ões), ${failures} falha(s).\n`);
process.exit(failures === 0 ? 0 : 1);
