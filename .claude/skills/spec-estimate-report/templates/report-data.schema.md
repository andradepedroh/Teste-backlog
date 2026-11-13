# `report-data.json` — schema do relatório consolidado

Este é o **único** artefato que a IA produz. O `cli.mjs` injeta este JSON no shell
congelado (`report-shell.html`) e gera o HTML. A engine de render é fixa: **ela lê
exatamente os campos abaixo**. Campo com nome errado = dado que não aparece.

- **Fonte de verdade do formato:** [`report-data.example.json`](report-data.example.json)
  (um projeto fictício e coerente, «Exemplo — Portal de Pedidos», que cobre todos os campos desta
  página, inclusive `tecnica.hld` — abra-o por trecho para ver a forma exata de qualquer campo; o
  conteúdo é inventado e não serve de texto para relatório nenhum).
- **Idioma:** todo texto humano em Português do Brasil.
- **Campos `*Nota`, `*resumo`, `elevatorPitch`, `interpretacao`, `brooks`, `problema`, `fix`,
  `resposta`, `justificativa`** e afins **aceitam HTML inline** (`<b>`, `<code>`, `<br>`) —
  são injetados como HTML, não escapados. O resto é escapado.
- **Contagens de heading são derivadas** pela engine a partir do tamanho dos arrays
  (ex.: «As N regras técnicas» = `tecnica.rules.length`). **Não** existe campo de número
  para elas — basta preencher o array certo.
- **Degradação:** uma aba cujo objeto estiver ausente **não renderiza** (o `cli.mjs` emite
  `AVISO`). A aba «Lacunas» degrada sozinha; as demais assumem seus objetos presentes.

## Raiz

```
{ meta, negocio, tecnica, testes, seguranca, gaps, backlog, estimativa }
```

As 7 abas correspondem 1:1 ao menu lateral. `meta` alimenta título, marca, rodapé e as
faixas de métrica.

---

## `meta`

| Campo | Tipo | Uso |
|-------|------|-----|
| `projeto` | string | fallback de título/marca; rodapé |
| `tituloHtml` | string? | `<title>` e cabeçalho (ex.: «Portal de Pedidos Exemplo — Especificação Completa»). Fallback: `${projeto} — Especificação` |
| `marca` | string? | `<h1>` da barra lateral. Fallback: `projeto` |
| `marcaSub` | string? | subtítulo da marca. Fallback: «Especificação» |
| `descricao` | string | descrição curta (não exibida diretamente, contexto) |
| `pipeline` | string | rodapé (ex.: «Eng_Proc — skills spec-* (Fases 0 a 8.5)») |
| `geradoEm` | string `YYYY-MM-DD` | rodapé |
| `fases[]` | `{fase, skill, data, artefatos[], resumo}` | histórico do pipeline (não exibido em tabela na v1, mas conta no rodapé: `fases.length`) |
| `totais` | object | faixas de métrica de várias abas — ver abaixo |

`meta.totais` (todos numéricos): `dominios, modulos, rf, rnf, rn, entidades, atributos,
indices, enums, canaisAssincronos, operacoesApi, pathsApi, schemasApi, codigosErro,
casosTeste, telas, fluxos, epics, features, stories, tasks, enablers, rules, linhasRules,
findingsSeguranca, gaps, diasEsforco`.

---

## `negocio` — aba 01

| Campo | Tipo | Notas |
|-------|------|-------|
| `visao.elevatorPitch` | string (HTML inline) | lede da aba |
| `doresQuantificadas[]` | `{id, dor, numero, fonte}` | as 9 primeiras com `numero` viram cards |
| `objetivos[]` | `{id, titulo, dono, krs[]}` | `krs[] = {kr, baseline, meta, fonte}` |
| `personas[]` | `{nome, tipo('externo'/'interno'), jtbd, dores[]}` | |
| `dominios[]` | `{nome, escopo, sistemaRegistro, rf, rn, telas, operacoes}` | tabela dos domínios |
| `modulos[]` | `{id, nome, dominio, superficie, sistemaDeRegistro, papelDoHub, status('futuro'?), rf, rn, entidades}` | tabela + gráfico empilhado (rf/rn/entidades) |
| `regrasDestaque[]` | `{id, modulo, enunciado, tipo('novo'?)}` | tabela de regras |
| `rollout[]` | `{onda, unidade, regime, porque}` | esteira de implantação |
| `escopo.incluido[]` | string[] | card «Incluído» |
| `escopo.foraDeEscopo[]` | `{item, razao}` | card «Fora de escopo» (10 primeiros) |
| `gaps.lista[]` | `{id, severidade, natureza, titulo, decisao}` | tabela; **heading «As N decisões» = `gaps.lista.length`** |
| `gaps.porSeveridade` | `{CRITICA/CRÍTICA, ALTA, MEDIA/MÉDIA, BAIXA}` | gráfico |
| `regrasDestaqueNota` | string? (HTML) | nota sob a tabela de regras (opcional) |
| `rolloutNota` | string? (HTML) | nota sob a esteira de rollout (opcional) |
| `gaps.nota` | string? (HTML) | nota sob o heading de decisões (opcional) |

---

## `tecnica` — aba 02

| Campo | Tipo | Notas |
|-------|------|-------|
| `arquitetura.resumo` | string | lede |
| `hld` | object? | **Opcional** — seção «Arquitetura (HLD)» no topo da aba. Vem do `hld.md` (Fase 6.6) via `check-hld.py --json`. Ausente (ou com `containers` vazio) → a seção inteira some, sem título nem âncora órfã. Ver `tecnica.hld` abaixo |
| `arquitetura.estilo` | string | heading «Arquitetura — …» |
| `arquitetura.camadas[]` | string[] | tags de fluxo de dependência |
| `arquitetura.fronteiras[]` | string[]? | lista |
| `stack[]` | `{camada, escolha, detalhe}` | cards de stack |
| `rules[]` | `{arquivo, escopo('sempre'?), paths, linhas, normatiza, destaques[]}` | árvore; **heading «As N regras técnicas» = `rules.length`** |
| `dataModel.contextos[]` | `{nome, entidades, prefixo}` | gráfico de barras |
| `dataModel.entidades[]` | `{nome, tabela, contexto, modulo, sistemaDeRegistro, atributos, indices, descricao, central(bool)}` | tabelas (centrais + todas) |
| `dataModel.enums[]` | `{nome, valores[]}` | cards; `valores[]` é **string[]** (cada valor vira uma tag — objeto aparece como `[object Object]`) |
| `dataModel.indicesDestaque[]` | `{nome, tabela, justificativa}` | tabela |
| `dataModel.canaisAssincronos[]` | `{canal, evento, politica('BLOQUEIA'/'ENFILEIRA'/…), dlq}` | tabela |
| `api.porModulo[]` | `{modulo, operacoes}` | gráfico (subtítulo derivado de `meta.totais.operacoesApi`/`pathsApi`) |
| `api.porVerbo` | `{GET, POST, …}` | gráfico |
| `api.errosPorStatus[]` | `{status, quantidade, exemplos[]}` | gráfico |
| `api.endpointsCriticos[]` | `{metodo, path, modulo, descricao, papeis[], degradacao?}` | tabela |
| `api.catalogoErros[]` | `{code, status, significado/titulo}` | tabela |
| `api.bloqueadosFMS[]` | `{metodo, path}` | callout (só aparece se houver itens) |
| `rulesNota` | string? (HTML) | nota sob heading de rules (opcional) |
| `api.catalogoErrosNota` | string? (HTML) | nota do catálogo de erros (opcional) |
| `api.bloqueadosNota` | string? (HTML) | prosa do callout de operações bloqueadas (opcional) |

### `tecnica.hld` — seção «Arquitetura (HLD)» (opcional)

Preenchida a partir de `python3 ../tools/check-hld.py outputs/spec/hld.md --json` (o `.md` **não**
é reparseado à mão). Os cinco arrays saem com o mesmo nome e a mesma forma do `--json` — copiar e,
no máximo, cortar o que não vai ao relatório. A seção é **executiva**: o detalhe completo
(fluxos, topologia, fronteiras de confiança, riscos e spikes) fica no `hld.md`.

| Campo | Tipo | Uso na engine |
|-------|------|---------------|
| `containers[]` | `{id, nome, responsabilidade, tecnologia}` | Caixas da coluna esquerda do diagrama SVG (as 14 primeiras). **Array vazio ou ausente = a seção não renderiza** |
| `integracoes[]` | `{id, sistema, containers[], direcao, estilo, protocolo, falha}` | Caixas da coluna direita (agrupadas por `sistema`, as 14 primeiras) + arestas. `estilo` começando em «assíncrono» desenha traço tracejado e entra na legenda; o resto é traço cheio |
| `decomposicao[]` | `{modulo, container, papel}` | Tabela «Onde cada módulo do produto mora» + selo `N módulos` em cada container. `container: "N/A"` vira a etiqueta «fora desta entrega» e o `papel` carrega a justificativa |
| `taticas[]` | `{rnf, metrica, tatica, containers[], justificativa, riscoAceito}` | Tabela «O que sustenta cada requisito de qualidade». `riscoAceito: true` (ou `tatica` começando em «Risco aceito») marca a etiqueta e conta na nota de rodapé |
| `adrs[]` | `{id, decisao, alternativas, consequencias, origem[]}` | Tabela de decisões; **heading «As N decisões de arquitetura registradas» = `adrs.length`** |
| `modo` | `"completo"` \| `"compacto"`? | Só muda a nota de rodapé (avisa que o desenho saiu em modo compacto) |
| `resumo` | string? (HTML inline) | Parágrafo de abertura da seção |
| `taticasNota` | string? (HTML inline) | Nota sob o heading das táticas |
| `adrsNota` | string? (HTML inline) | Nota sob o heading dos ADRs |

O diagrama é desenhado em **SVG no cliente**, como os demais gráficos — o shell não carrega CDN,
então Mermaid não renderiza aqui. `justificativa` e `falha` não aparecem na tela: entram no
payload para manter o bloco fiel ao `--json` e servir de tooltip/expansão futura.

---

## `testes` — aba 03

| Campo | Tipo | Notas |
|-------|------|-------|
| `totais` | `{casos, epicas}` | faixa |
| `cobertura` | `{rfCobertos, rfTotal, rnCobertos, rnTotal, rnSemCaso[]}` | `rnSemCaso[] = {id, razao}` |
| `porTipo` | `{PRINCIPAL, BORDA, REGRA, …}` | gráfico |
| `porEpica[]` | `{epica, nome, casos}` | gráfico |
| `jornadasCriticas[]` | `{n, nome, casosPrincipais[]}` | cards; **heading «As N jornadas críticas» = `jornadasCriticas.length`** |
| `casosCriticos[]` | `{id, titulo, tipo('ACESSO'/'REGRA'/…), epica, resumo, rn[]}` | tabela |
| `bloqueados[]` | `{id, titulo, motivo}` | tabela |

---

## `seguranca` — aba 04

| Campo | Tipo | Notas |
|-------|------|-------|
| `resumo` | `{critico, alto, medio, baixo, injetados, storiesAfetadas, esforcoDias, historiasAnalisadas}` | faixa + lede (contagens dinâmicas) |
| `achadoEstrutural` | string? (HTML) | callout de destaque |
| `camadasRule[]` | `{letra, nome, asvs, resumo}` | tabela; **heading «As N camadas» = `camadasRule.length`** |
| `findings[]` | `{id, nome, severidade, cvss, owasp, cwe, stride, camada, injetado(bool), esforco?, problema, risco, fix, testeRed, testeGreen, storyAfetada?}` | árvore; **heading «Os N achados» = `findings.length`**; a nota (injetados × não injetados) é derivada de `injetado` |
| `porCamada[]` | `{camada, quantidade}` | gráfico |
| `pontosAuditados[]` | `{n, ponto, conclusao, tasks}` | tabela; **heading «Os N pontos auditados» = `pontosAuditados.length`** |
| `controlesZeroOcorrencia[]` | string[] | tags |
| `checklistPreDeploy[]` | `{item, coberto(bool), onde?}` | lista |
| `limitacoes[]` | string[]? | callout |
| `controlesZeroNota` | string? (HTML) | nota do card de controles (opcional; fallback genérico) |

---

## `gaps` — aba 05 (degrada sozinha se ausente)

| Campo | Tipo | Notas |
|-------|------|-------|
| `resumo` | `{total, respondidos, naoRespondidos, bloqueantes, comPendenciaResidual, porSeveridade, porNatureza, nota}` | faixa + gráficos |
| `conjuntos[]` | `{nome, faixa, quantidade, status('respondido'?), quemRespondeu, quando, explicacao}` | cards |
| `itens[]` | ver abaixo | árvore com busca (respondidas × não respondidas) |

`itens[]`: `{id, conjunto, titulo, severidade, natureza('DERIVADA'/'ARBITRADA'/'PENDENTE'/'NAO_RESPONDIDO'),
bloqueante(bool), respondido(bool), donoSugerido, problema, porQueImporta, perguntas[],
resposta, justificativa, decisor, data, pendenciaResidual, ratificarCom, artefatosAfetados[],
statusPropagacao}`.

---

## `backlog` — aba 06 (Épico › Feature › Story › Task)

| Campo | Tipo | Notas |
|-------|------|-------|
| `totais` | `{epics, features, stories, tasks, esforcoDiasTasks, storiesNegocio, enablers, storiesUat, tasksSeguranca}` | faixa; `storiesNegocio` conta só a `USER_STORY` do `tasks.json` — SPIKE, TECHNICAL_DEBT e BUG ficam na árvore como `story`, mas fora das três categorias da faixa (negócio · habilitadores · UAT) |
| `epics[]` | ver abaixo | árvore completa; tasks são **lazy** (renderizadas ao abrir a história) |
| `dependenciasGlobais` | `{chave: texto}` | cards |
| `errorHandlingPadrao` | `{chave: texto}` | card |
| `criteriosAceitePadraoTask` | `{tecnico[], nota}` | card |

Hierarquia: `epics[] → features[] → stories[] → tasks[]`.
- **epic:** `{id, titulo, prioridade, dominio, rolloutWave, objetivo, problema, esforcoDias,
  modulos[], personas[], sistemasLegados[], capacidades[], resultados[], metricas[],
  foraDeEscopo[], dependencias[], riscos[], criteriosAceite[], features[]}`
- **feature:** `{id, titulo, modulo, prioridade, esforcoDias, descricao, valorEntregue,
  fluxos[], telas[], rf[], criteriosAceite[], stories[]}`
- **story:** `{id, titulo, tipo('story'/'enabler'/'uat'), prioridade, bloqueadoPor?, esforcoDias,
  rolloutWave?, narrativa{comoA,quero,para}, contexto, enabler{capacidade,porQue,desbloqueia[],risco},
  gherkin[]{cenario,passos[]}, criteriosAceite[], regrasNegocio[]{id,texto} (objeto, nunca string — o
  shell lê `r.id` e `r.texto`), entidades[],
  endpoints[], telas[], papeis[], estadosUI[], definitionOfDone[], casosDeTesteDeNegocio[], tasks[]}`
- **task:** `{id, titulo, tipo, tamanho?, esforcoDias, isSec/classe('security')?, escopo,
  seguranca{severidade,cvss,owasp,cwe,stride,camada}?, cenarios[], criteriosAceite[],
  testeRed?, testeGreen?}`

---

## `estimativa` — aba 07

> **Atenção:** este bloco **não** é o `estimate-data.json` copiado. A engine usa nomes
> próprios (`forecast.p50`, `custos.calendarioBRL`, `caminhoCritico`, `cocomo`, `cenarios`,
> `cronogramaSequencial`, `sensibilidade`, `forecast.iaAssistida`). Ao gerar, **remapeie**
> o `estimate-data.json`/`estimate-report.md` para esta forma.

| Campo | Tipo | Notas |
|-------|------|-------|
| `equipe.pessoas` | number | `NP` — usado em toda a aba (lede, modos, custos) |
| `forecast` | `{inicio, iteracoesMonteCarlo, pisoEstrutural, p15, p50, p85, p95, iaAssistida}` | cada `pXX = {dias, data, custoBRL, semanas}` |
| `forecast.iaAssistida` | `{p15?, p50, p85, p95, pessoas, esforcoPM, economiaPct, nota, notaDerivacao}` | modo IA |
| `indices` | `{dci, dciIA, interpretacao}` | callout de recomendação |
| `custos` | `{calendarioBRL{p50,p85,p95}, esforcoPuroBRL{…}, iaAssistidaBRL{…}, comparativoModos{linhas[],ganhoPrazoX}}` | tabelas; `linhas[] = {metrica, tradicional, ia, moeda(bool)}` |
| `riscos[]` | `{id, categoria, risco, probabilidade, impactoDias, esperadoDias}` | cards + gráfico + tabela; total derivado |
| `caminhoCritico` | `{dias, diasIA, tarefas, resumo, gargalos[]}` | `gargalos[] = {id, nome, score, porque, acao}` — obrigatório (o shell lê `.length`); o `--montar` com `--estimate-calc` monta `id`, `score` e `nome`, e a IA escreve `porque` e `acao` |
| `equipe.composicao[]` | `{squad, tipo, pessoas, foco, cargaCognitiva}` | tabela |
| `equipe.brooksCurva[]` | `{pessoas, dias, overheadPct}` | gráfico de linha |
| `equipe.brooks` | string (HTML) | texto «por que N» |
| `equipe.lacunasEspecializacao[]` | `{competencia, cobertura, recomendacao}` | tabela |
| `porEpic[]` | `{epic, titulo, dominio, esforcoDias, onda, risco('alto'/'medio'/…)}` | gráfico + tabela |
| `porOnda[]` | `{onda, backlogDias, tarefas, pct}` | gráfico |
| `sensibilidade[]` | `{variavel, efeitoDias, descricao}` | gráfico (o que mais move a data) |
| `cocomo` | `{pm, pmCocomoCalibrado, pmCocomoPadrao, calibracao, fatores[]}` | `fatores[] = {fator, valor, justificativa}` |
| `cenarios[]` | `{id, nome, descricao, diasIdeais, p50Data, p85Data, custoP85BRL, oQueFicaDeFora[], dorQueResolve, recomendado(bool), ia{p50Data,p85Data,custoP85BRL}}` | cards (só se houver) |
| `cronogramaSequencial[]` | `{ordem, epic, titulo, inicio, fim, devsQueCabem, duracaoHumanaDias, ia{inicio,fim,duracaoDias}}` | tabela (só se houver) |
| `desperdicioSequenciamento` | `{pessoaDia, pct, custoBRL, diasCalendario, nota}` | usado na nota do cronograma |
| `foraDoForecast[]` | `{item, dias, razao}` | tabela |
| `pendencias[]` | `{gap, o_que, efeito}` | tabela |
| `recomendacoes[]` | `{titulo, oQue, porQue, quem, quando, esforco}` | cards |
| `premissas[]` | `{premissa, valor, base}` | tabela |
| `calibracaoNota` | string? (HTML) | cláusula de calibração no lede (opcional) |
| `riscosNota` | string? (HTML) | prosa do callout de risco acumulado (opcional) |
| `cenariosNota` | string? (HTML) | nota do heading «Cenários de escopo» (opcional) |
| `cenarioCompleto` | string? (HTML) | callout ao fim dos cenários (opcional) |

---

## Mínimo viável

Uma aba renderiza com o essencial mesmo sem os campos opcionais (`*Nota`, `*resumo` extras).
Para um relatório completo, preencha tudo que a fonte fornecer. Campos `*Nota` são a editoria
do consultor — omita-os e a seção some sem quebrar o layout.
