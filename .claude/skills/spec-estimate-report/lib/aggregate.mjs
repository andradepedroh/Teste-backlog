// Agregador determinístico do report-data.json (Decisão 70, plano de melhoria das skills, Onda 5).
//
// A aba Backlog era a IA reescrevendo à mão a árvore inteira do tasks.json (58,9% do exemplo antigo,
// de 1,4 MB), e a aba Técnica copiando à mão o `check-hld.py --json`. O que já existe em JSON
// estruturado agora entra por código; a IA fica com o que é editoria (os campos `*Nota`, `resumo`,
// as abas de negócio/testes/segurança e a narrativa da estimativa).
//
//   montarBacklog(tasks)        → bloco `backlog` (totais + epics → features → stories → tasks)
//   montarHld(hldJson)          → bloco `tecnica.hld` (os cinco arrays do --json, como vieram)
//   montarForecast(calc)        → `estimativa.forecast` e `estimativa.caminhoCritico` (números do
//                                 estimate-calc.json do forecast.mjs da spec-estimate, gargalos inclusive)
//   conferirTotais(data, tasks) → META_TOTAIS_MATCH: `meta.totais` × contagem do tasks.json
//
// O formato de cada nó é o do `templates/report-data.example.json`, campo por campo e com o mesmo
// tipo — campo sem fonte no tasks.json sai vazio ('' / [] / 0), nunca inventado. No `--montar`
// (montarReportData), o campo que saiu vazio é herdado do nó de mesmo ID que já estava no
// report-data.json — é o texto que a IA escreveu (Definição de pronto, papéis, onda, enabler…).

const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const str = (v) => (typeof v === 'string' ? v : '');
const textos = (v) => arr(v).map((x) => (typeof x === 'string' ? x : str(x?.statement) || str(x?.title) || str(x?.description) || str(x?.metric) || str(x?.name))).filter(Boolean);
const r1 = (x) => Math.round(x * 10) / 10;

const diasDaTask = (t) => (typeof t.durationEstimatedDays === 'number' ? t.durationEstimatedDays
  : typeof t?.effortHours?.manual === 'number' ? t.effortHours.manual / 8 : 0);
const tipoDaStory = (s) => {
  const w = String(s.workItemType ?? '').toUpperCase();
  if (w === 'ENABLER') return 'enabler';
  if (s.class === 'uat' || s.testType === 'UAT') return 'uat';
  return 'story';
};
// História de negócio é a USER_STORY (o default). SPIKE, TECHNICAL_DEBT e BUG são demanda operacional
// técnica (spec-tasks, § «Tipos de Demanda Operacional»): continuam na árvore como `story`, mas não
// entram na contagem «negócio» da faixa da aba Backlog.
const OPERACIONAIS = new Set(['SPIKE', 'TECHNICAL_DEBT', 'BUG']);
const ehNegocio = (s) => tipoDaStory(s) === 'story' && !OPERACIONAIS.has(String(s.workItemType ?? '').toUpperCase());

function montarTask(t) {
  const sec = obj(t.security);
  const cenarios = arr(t.acceptanceScenarios);
  return {
    id: str(t.id), titulo: str(t.title) || str(t.id), tipo: str(t.type), esforcoDias: r1(diasDaTask(t)),
    escopo: str(t.description), classe: str(t.class) || 'functional', isSec: t.class === 'security',
    tamanho: str(t.effortEstimate),
    criteriosAceite: textos(t.acceptanceCriteria).length ? textos(t.acceptanceCriteria) : textos(obj(t.validation).businessCriteria),
    seguranca: {
      severidade: str(sec.severity), cvss: typeof sec.cvss === 'number' ? sec.cvss : 0,
      owasp: arr(sec.owasp).join(', '), cwe: arr(sec.cwe).join(', '), stride: str(sec.stride),
      camada: str(t.type), bloqueiaFechamento: sec.mustCompleteBeforeStoryClose === true,
    },
    testeRed: str(obj(t.tddTests).red), testeGreen: str(obj(t.tddTests).green),
    cenarios: cenarios.map((c) => str(c?.title) || [c?.given, c?.when, c?.then].filter(Boolean).join(' · ')).filter(Boolean),
    nCenarios: cenarios.length,
    casosDeTeste: arr(t.testCaseIds).filter((x) => typeof x === 'string'),
  };
}

function montarStory(s) {
  const us = obj(s.userStory);
  const ui = obj(s.uiContext);
  const tasks = arr(s.tasks).map(montarTask);
  const gherkin = arr(s.acceptanceScenarios).map((c) => ({ cenario: str(c?.title) || str(c?.id), passos: [c?.given, c?.when, c?.then].filter((x) => typeof x === 'string' && x) }));
  // {id, texto}: a forma do schema — o shell lê r.id e r.texto (string virava bullet vazio).
  const regras = arr(s.businessRules).map((r) => (typeof r === 'string' ? { id: '', texto: r }
    : { id: str(r?.id), texto: str(r?.statement) || str(r?.title) || str(r?.description) }));
  const ca = textos(s.acceptanceCriteria);
  return {
    id: str(s.id), titulo: str(s.name) || str(s.title) || str(s.id), tipo: tipoDaStory(s), prioridade: str(s.priority),
    esforcoDias: r1(tasks.reduce((n, t) => n + t.esforcoDias, 0)), rolloutWave: '', modulo: str(s.featureId),
    narrativa: { comoA: str(us.asA), quero: str(us.iWant), para: str(us.soThat) },
    contexto: str(obj(s.narrative).context), gherkin, nGherkin: gherkin.length,
    criteriosAceite: ca, nCriteriosAceite: ca.length, regrasNegocio: regras, nRegras: regras.length,
    entidades: arr(ui.entidades).filter((x) => typeof x === 'string'), endpoints: arr(ui.endpoints).filter((x) => typeof x === 'string'),
    estadosUI: arr(ui.estadosUI).filter((x) => typeof x === 'string'), definitionOfDone: [], nDefinitionOfDone: 0,
    casosDeTesteDeNegocio: [], bloqueadoPor: arr(s.dependencies).length ? arr(s.dependencies).join(', ') : null,
    tasks, telas: str(ui.tela) ? [str(ui.tela)] : [], papeis: [], mustImplementFirst: s.mustImplementFirst === true,
  };
}

function montarFeature(f, stories) {
  const ss = stories.map(montarStory);
  const ca = textos(f.acceptanceCriteria);
  return {
    id: str(f.id), titulo: str(f.name) || str(f.title) || str(f.id), modulo: str(f.moduleCode), prioridade: str(f.priority),
    descricao: str(obj(f.narrative).context) || str(obj(f.narrative).elevatorPitch), valorEntregue: str(obj(f.narrative).deliveredValue),
    esforcoDias: r1(ss.reduce((n, s) => n + s.esforcoDias, 0)), fluxos: [], telas: arr(f.touchpoints).filter((x) => typeof x === 'string'),
    rf: arr(obj(f.traceability).rf).filter((x) => typeof x === 'string'), criteriosAceite: ca, totalCriteriosAceite: ca.length,
    totalRegras: arr(f.businessRules).length, stories: ss,
  };
}

/** Bloco `backlog` inteiro, a partir do tasks.json. Stories sem feature entram numa feature sintética da epic. */
export function montarBacklog(tasks) {
  const epics = arr(tasks?.epics); const features = arr(tasks?.features); const stories = arr(tasks?.stories);
  const featIds = new Set(features.map((f) => f.id));
  const montarEpic = (e, fs, soltas) => {
    const featuresNo = fs.map((f) => montarFeature(f, stories.filter((s) => s.featureId === f.id)));
    if (soltas.length) featuresNo.push(montarFeature({ id: `${e.id ?? 'SEM-EPIC'}-STORIES`, name: 'Histórias sem feature' }, soltas));
    const n = obj(e.narrative);
    const ca = textos(e.acceptanceCriteria);
    return {
      id: str(e.id), titulo: str(e.name) || str(e.title) || str(e.id), prioridade: str(e.priority),
      objetivo: str(e.executiveSummary) || str(n.elevatorPitch), problema: str(e.problemStatement) || str(n.problem),
      dominio: arr(e.moduleScope).filter((x) => typeof x === 'string')[0] ?? '', modulos: arr(e.moduleScope).filter((x) => typeof x === 'string'),
      esforcoDias: r1(featuresNo.reduce((s, f) => s + f.esforcoDias, 0)), rolloutWave: '', sistemasLegados: [],
      riscos: textos(e.businessRisks), criteriosAceite: ca, totalCriteriosAceite: ca.length, metricas: textos(e.successMetrics),
      resultados: textos(e.businessOutcomes), foraDeEscopo: textos(e.outOfScope).length ? textos(e.outOfScope) : textos(obj(e.scopeBoundaries).outOfScope),
      personas: textos(e.stakeholders), capacidades: textos(e.inScopeCapabilities), dependencias: arr(e.dependencies).filter((x) => typeof x === 'string'),
      totalRegras: arr(e.businessRules).length, features: featuresNo,
    };
  };
  let saida;
  if (epics.length) {
    saida = epics.map((e) => montarEpic(e, features.filter((f) => f.epicId === e.id),
      stories.filter((s) => !featIds.has(s.featureId) && s.epicId === e.id)));
    const orfasF = features.filter((f) => !epics.some((e) => e.id === f.epicId));
    const orfasS = stories.filter((s) => !featIds.has(s.featureId) && !epics.some((e) => e.id === s.epicId));
    if (orfasF.length || orfasS.length) saida.push(montarEpic({ id: 'SEM-EPIC', name: 'Itens sem épico' }, orfasF, orfasS));
  } else {
    saida = [montarEpic({ id: 'BACKLOG', name: 'Backlog' }, features, stories.filter((s) => !featIds.has(s.featureId)))];
  }
  const todasStories = saida.flatMap((e) => e.features).flatMap((f) => f.stories);
  const todasTasks = todasStories.flatMap((s) => s.tasks);
  return {
    totais: {
      epics: epics.length, features: features.length, stories: stories.length, tasks: todasTasks.length,
      esforcoDias: r1(todasTasks.reduce((n, t) => n + t.esforcoDias, 0)), esforcoDiasTasks: r1(todasTasks.reduce((n, t) => n + t.esforcoDias, 0)),
      storiesNegocio: stories.filter(ehNegocio).length, enablers: todasStories.filter((s) => s.tipo === 'enabler').length,
      storiesUat: todasStories.filter((s) => s.tipo === 'uat').length,
      tasksFuncionais: todasTasks.filter((t) => !t.isSec && t.classe !== 'uat').length,
      tasksSeguranca: todasTasks.filter((t) => t.isSec).length, tasksUat: todasTasks.filter((t) => t.classe === 'uat').length,
    },
    epics: saida,
  };
}

/** `tecnica.hld`: os cinco arrays do `check-hld.py --json`, como vieram (o schema manda copiar). */
export function montarHld(hldJson) {
  const h = obj(hldJson);
  const out = {};
  for (const k of ['containers', 'integracoes', 'decomposicao', 'taticas', 'adrs']) out[k] = arr(h[k] ?? obj(h.hld)[k]);
  if (typeof h.modo === 'string') out.modo = h.modo;
  return out;
}

const dataBR = (iso) => (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '');

/**
 * Números de `estimativa.forecast` e `estimativa.caminhoCritico` a partir do estimate-calc.json.
 * `caminhoCritico.gargalos` sai dos `gargalos` do forecast.mjs (top-5 do bottleneck_score) na forma do
 * schema `{id, nome, score, porque, acao}`: o score vem do cálculo, o nome do tasks.json (`nomes`), e
 * `porque`/`acao` são editoria da IA, herdados pelo ID no --montar. Antes o bloco saía sem `gargalos`,
 * e o shell — que lê `gargalos.length` sem guarda — quebrava a aba Estimativa (D59). estimate-calc.json
 * sem `gargalos` (anterior ao forecast.mjs) não mexe no que já estava lá.
 */
export function montarForecast(calc, { nomes = new Map() } = {}) {
  const mc = obj(obj(calc?.monteCarlo).humano);
  const ia = obj(calc?.monteCarlo).ia ? obj(calc.monteCarlo.ia) : null;
  const ponto = (m, k) => ({ dias: m[k] ?? 0, data: dataBR(obj(m.datas)[k]), semanas: Math.ceil((m[k] ?? 0) / 5) });
  const forecast = { inicio: str(obj(calc?.calibracao).startDate), iteracoesMonteCarlo: mc.iteracoes ?? 0,
    pisoEstrutural: obj(obj(calc?.cpm).humano).duracaoDias ?? 0,
    p15: ponto(mc, 'p15'), p50: ponto(mc, 'p50'), p85: ponto(mc, 'p85'), p95: ponto(mc, 'p95') };
  if (ia) forecast.iaAssistida = { p15: ponto(ia, 'p15'), p50: ponto(ia, 'p50'), p85: ponto(ia, 'p85'), p95: ponto(ia, 'p95') };
  const h = obj(obj(calc?.cpm).humano); const hi = obj(obj(calc?.cpm).ia);
  const caminhoCritico = { dias: h.duracaoDias ?? 0, diasIA: hi.duracaoDias ?? 0, tarefas: arr(h.caminhoCritico).length, sequencia: arr(h.caminhoCritico) };
  if (Array.isArray(calc?.gargalos)) {
    caminhoCritico.gargalos = calc.gargalos.filter((g) => typeof g?.id === 'string' && g.id).map((g) => ({
      id: g.id, nome: nomes.get(g.id) ?? '', score: typeof g.bottleneckScore === 'number' ? g.bottleneckScore : 0, porque: '', acao: '',
    }));
  }
  return { forecast, caminhoCritico };
}

/** id → título de cada task do tasks.json (stories[].tasks[] e tasks[] soltas). */
const nomesDasTasks = (tasks) => new Map([...arr(tasks?.stories).flatMap((s) => arr(s?.tasks)), ...arr(tasks?.tasks)]
  .filter((t) => typeof t?.id === 'string').map((t) => [t.id, str(t.title) || str(t.name)]));

/** META_TOTAIS_MATCH: o que `meta.totais` diz × o que o tasks.json tem. */
export function conferirTotais(data, tasks) {
  const t = obj(obj(data?.meta).totais);
  const b = montarBacklog(tasks).totais;
  const avisos = [];
  for (const k of ['epics', 'features', 'stories', 'tasks', 'enablers']) {
    if (typeof t[k] === 'number' && t[k] !== b[k]) avisos.push(`META_TOTAIS_MATCH: meta.totais.${k} = ${t[k]}, mas o tasks.json tem ${b[k]}`);
  }
  return avisos;
}

// --- texto da IA dentro da árvore do backlog -------------------------------------------------------
// O tasks.json não tem Definição de pronto, papéis, onda de rollout, casos de teste de negócio, enabler,
// fluxos, sistemas legados…: o montarStory/montarFeature/… grava esses campos vazios. Ao montar, cada nó
// é casado pelo ID (no mesmo nível) com o nó que já estava no report-data.json e herda dele o que saiu
// vazio. O tasks.json continua dono da estrutura (os filhos), do esforço e dos totais.
const FILHO = { epic: ['features', 'feature'], feature: ['stories', 'story'], story: ['tasks', 'task'] };
const DO_TASKS = new Set(['id', 'esforcoDias', 'totalRegras', 'features', 'stories', 'tasks']);
// Contador que acompanha um array: se o array veio do report-data anterior, o contador vem junto.
const CONTADORES = { criteriosAceite: ['nCriteriosAceite', 'totalCriteriosAceite'], gherkin: ['nGherkin'],
  regrasNegocio: ['nRegras'], definitionOfDone: ['nDefinitionOfDone'], cenarios: ['nCenarios'] };
const EH_CONTADOR = new Set(Object.values(CONTADORES).flat());
const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const vazio = (v) => v == null || v === '' || v === 0 || (Array.isArray(v) && v.length === 0)
  || (ehObjeto(v) && Object.values(v).every(vazio));

function herdar(montado, anterior) {
  if (!ehObjeto(anterior)) return montado;
  const out = { ...montado };
  const herdados = new Set();
  for (const [k, v] of Object.entries(anterior)) {
    if (DO_TASKS.has(k) || EH_CONTADOR.has(k) || vazio(v)) continue;
    if (k === 'titulo' && out.id && out.titulo === out.id) { out.titulo = v; continue; } // o código caiu no ID por falta de nome
    if (ehObjeto(out[k]) && ehObjeto(v)) out[k] = herdar(out[k], v);             // narrativa, seguranca, enabler
    else if (vazio(out[k])) { out[k] = v; herdados.add(k); }
  }
  for (const [lista, contadores] of Object.entries(CONTADORES)) {
    if (!herdados.has(lista)) continue;
    for (const c of contadores) if (c in out || c in anterior) out[c] = typeof anterior[c] === 'number' ? anterior[c] : out[lista].length;
  }
  return out;
}

function preservarTexto(epicsMontados, epicsAnteriores) {
  const indice = { epic: new Map(), feature: new Map(), story: new Map(), task: new Map() };
  const indexar = (nos, nivel) => {
    for (const n of arr(nos)) {
      if (!ehObjeto(n)) continue;
      if (typeof n.id === 'string' && n.id && !indice[nivel].has(n.id)) indice[nivel].set(n.id, n);
      if (FILHO[nivel]) indexar(n[FILHO[nivel][0]], FILHO[nivel][1]);
    }
  };
  indexar(epicsAnteriores, 'epic');
  const casar = (no, nivel) => {
    const out = herdar(no, indice[nivel].get(no.id));
    if (FILHO[nivel]) { const [chave, prox] = FILHO[nivel]; out[chave] = no[chave].map((x) => casar(x, prox)); }
    return out;
  };
  return epicsMontados.map((e) => casar(e, 'epic'));
}

/** Junta os blocos montados por código num report-data.json, sem tocar no resto (texto da IA). */
export function montarReportData(data, { tasks = null, hld = null, calc = null } = {}) {
  const out = structuredClone(obj(data));
  if (tasks) {
    const b = montarBacklog(tasks);
    out.backlog = { ...obj(out.backlog), totais: b.totais, epics: preservarTexto(b.epics, obj(out.backlog).epics) };
    out.meta = { ...obj(out.meta), totais: { ...obj(obj(out.meta).totais), epics: b.totais.epics, features: b.totais.features, stories: b.totais.stories, tasks: b.totais.tasks, enablers: b.totais.enablers } };
  }
  if (hld) out.tecnica = { ...obj(out.tecnica), hld: { ...obj(obj(out.tecnica).hld), ...montarHld(hld) } };
  if (calc) {
    const f = montarForecast(calc, { nomes: nomesDasTasks(tasks) });
    const ccAntes = obj(obj(out.estimativa).caminhoCritico);
    const cc = { ...ccAntes, ...f.caminhoCritico };
    if (f.caminhoCritico.gargalos) {
      // A lista é a do forecast; o texto da IA (porque, acao, nome sem fonte) vem do gargalo de mesmo ID.
      const anteriores = new Map(arr(ccAntes.gargalos).filter(ehObjeto).map((g) => [g.id, g]));
      cc.gargalos = f.caminhoCritico.gargalos.map((g) => ({ ...herdar(g, anteriores.get(g.id)), score: g.score }));
    }
    out.estimativa = { ...obj(out.estimativa),
      forecast: { ...obj(obj(out.estimativa).forecast), ...f.forecast },
      caminhoCritico: cc };
  }
  return out;
}
