---
name: spec-iterate
description: >
  spec-iterate (Reconciliação (cross-fase)) — ciclo explícito de fecho de GAPs em duas fases:
  ETAPA A — Auditoria ativa: o agente varre todos os artefatos e gera um "Relatório de Revisão"
  com problemas detectados, pontos cegos e inconsistências — formatado como perguntas diretas
  ao consultor. ETAPA B — Resposta e propagação: consultor responde no arquivo de respostas
  (gaps-answers.md ou diretamente em gaps.md), e o agente propaga decisões para protótipo e docs.
  Formato GAP-XXX com 13 campos. Saídas: gaps.md + gaps-answers.md + sync-log.md.
version: "1.4"
updated: "2026-10-21"
---

# spec-iterate — Auditoria, GAPs e Propagação

## Sync-log (obrigatório)

Esta skill é a **dona** do `sync-log.md`. Antes de iniciar, ler Seção A para reconstituir o estado atual do projeto. Ao terminar Etapa A (auditoria) e Etapa B (propagação), registrar entradas em:
- **Seção A:** uma linha para a execução (Etapa A e Etapa B separadas se forem turnos diferentes)
- **Seção B:** uma linha por GAP propagado, com decisor e direção

Regras gerais em [`spec/SKILL.md`](../spec/SKILL.md) seção «Sync-log como memória cross-cutting».

## Papel

**Etapa A:** varrer ativamente todos os artefatos e **revelar ao consultor** o que pode ter passado despercebido — inconsistências, pontos cegos, cenários não cobertos, regras conflitantes.

**Etapa B:** receber as respostas do consultor e **propagar as decisões** para protótipo e documentação de forma rastreável.

**Regra de ouro:** um GAP-XXX só está fechado quando (1) tem decisão específica em Answers, (2) foi propagado para todos os arquivos em "Afeta", e (3) entrou no `sync-log.md` no mesmo turno.

---

## Linguagem clara — como escrever o que o humano vai ler (OBRIGATÓRIO)

<!-- linguagem-clara:v1 inicio -->
<!-- Bloco canônico. Ao alterar, rodar `python scripts/apply_linguagem_clara.py` para replicar em todas as skills. -->

**Quem lê não é você.** É o desenvolvedor que pegou a task sem ter participado do discovery, o PO
que precisa aprovar, o analista que entrou no time semana passada. Texto correto e ilegível custa
uma reunião — e quem lê desiste e vai perguntar. Escrever difícil não é sinal de rigor: é defeito de
geração, do mesmo peso de um campo obrigatório faltando.

**Alvo verificável:** uma pessoa que nunca viu este projeto entende o que precisa fazer **lendo uma
vez**, sem abrir outro documento e sem precisar procurar o significado de nenhuma palavra.

### As 10 regras

1. **Frase curta, voz ativa, presente.** "O serviço confere o CPF antes de gravar" — não "a
   validação do CPF é realizada previamente à persistência". Alvo: até ~25 palavras por frase, uma
   ideia por frase.
2. **Termo técnico ganha explicação de meia linha na primeira aparição:** "no repository (a classe
   que conversa com o banco)", "um índice único (o banco passa a recusar duplicados sozinho)". Da
   segunda vez em diante, usar o termo puro.
3. **Nenhuma sigla solta.** Expandir na primeira aparição — inclusive as siglas do negócio e as da
   própria metodologia: "IDOR (quando um usuário consegue acessar o registro de outro)",
   "DV (Documento de Visão)", "RN (Regra de Negócio)".
4. **Código de regra ou de requisito nunca substitui o conteúdo dela.** Escrever a regra por extenso
   e pôr o código no fim, entre parênteses: "não deixa cadastrar dois clientes com o mesmo CPF
   (RN-012)". "Implementar a RN-012" não informa nada a quem não tem o documento aberto.
5. **Nome de arquivo, tabela, rota ou classe sempre acompanhado do papel dele.**
   `PedidoService.java` sozinho não diz nada; `PedidoService.java — onde ficam as regras de quando
   um pedido pode ser aprovado` diz. Vale igual para `TB_PEDIDO` e para `POST /pedidos`.
6. **Sem jargão de processo.** "blueprint", "gate", "FATAL", "matriz de cenários", "compact-prose",
   nome de validator, nome de camada de arquitetura: isso é vocabulário interno das skills, não do
   leitor. Traduzir — em vez de "6 cenários da matriz em VERDE", escrever "testei 6 situações, todas
   passaram".
7. **Sem "simplesmente", "basta", "apenas", "trivial", "é só".** Minimizam a dificuldade e afastam
   quem não entendeu de primeira.
8. **Verbo no lugar de substantivo; ativa no lugar de passiva.** "realizar a validação" → "validar";
   "efetuar o cadastramento" → "cadastrar"; "é disponibilizado ao usuário" → "o sistema mostra";
   "deve ser efetuada a persistência" → "grava no banco".
9. **Cenário de teste é uma frase "quando X, o sistema Y"** — nunca o id do cenário, nunca o nome do
   método de teste: "quando o CPF já existe, o sistema recusa e mostra 'CPF já cadastrado'".
10. **Bloco técnico denso abre com uma frase em português dizendo o que ele significa.** Contrato de
    API, colunas de tabela, status HTTP, schema, JSON: o conteúdo continua **completo e preciso** —
    o que muda é que antes dele vem uma linha do tipo "esta rota cria o pedido e devolve o número
    dele; se o CPF não existir, recusa com 404". Precisão técnica e legibilidade não competem: a
    frase de abertura é o mapa, o bloco é o território.

### Antes → depois (referência de tom)

| Complexo (não usar) | Claro (usar) |
|---|---|
| "Implementar validação de unicidade conforme RN-012, com persistência idempotente." | "Impedir o cadastro de dois clientes com o mesmo CPF. Se o CPF já existir, o sistema recusa e mostra 'CPF já cadastrado' — nada é gravado. Se a mesma requisição chegar duas vezes, o resultado é o mesmo da primeira (RN-012)." |
| "A entidade é submetida ao processo de normalização previamente à sua persistência." | "Antes de gravar, o sistema padroniza os dados: tira acento, deixa em maiúscula e remove espaço sobrando." |
| "Realizar o tratamento de exceções no fluxo de integração." | "Se o sistema externo não responder, tentar mais 2 vezes. Se ainda falhar, guardar a solicitação na fila e avisar o usuário que o processamento termina depois." |
| "Garantir a aderência aos padrões arquiteturais definidos." | "Seguir o padrão do projeto: a tela nunca fala direto com o banco, sempre passa pelo serviço." |
| "Disponibilizar endpoint para consulta paginada de pedidos com filtros." | "Criar a busca de pedidos: quem chama informa a página e pode filtrar por cliente, período e situação. A resposta traz 20 pedidos por vez e o total encontrado." |
| "Efetuar refatoração do componente visando redução do acoplamento." | "Separar o componente em dois, para que mudar a regra de desconto deixe de exigir mexer na tela." |

### Como conferir antes de entregar (30 segundos)

1. Leia em voz alta a **primeira frase de cada seção**. Travou a língua? Reescreva.
2. Existe alguma palavra que um analista de primeiro emprego **não usaria numa conversa**? Troque, ou
   explique entre parênteses na primeira aparição.
3. Alguma frase obriga a abrir outro documento para fazer sentido — sigla, código de regra, nome de
   arquivo sem o papel dele? Complete ali mesmo.
4. Algum bloco técnico começa direto no JSON, na tabela ou no YAML? Ponha a frase de abertura.

> **Isto não autoriza cortar conteúdo.** Nenhuma das regras acima permite resumir, omitir campo
> obrigatório ou trocar dado concreto por prosa. Linguagem clara é sobre a **forma**; densidade,
> precisão e auto-suficiência continuam sendo sobre o **conteúdo**. As duas coisas valem juntas.

<!-- linguagem-clara:v1 fim -->

### Aplicação nesta skill

Vale para `gaps.md` e `gaps-answers.md`. Critério de aceite do GAP: **a pergunta tem que ser respondível por quem é do negócio, sem ajuda.** GAP escrito em jargão técnico volta sem resposta, ou volta com a resposta errada — e isso custa uma rodada inteira de iteração.

## Prioridade — GAPs de negócio (o coração do spec)

O valor desta skill está em **decisões de negócio ainda abertas**, não em lista de dívidas técnicas do protótipo.

| Tipo | Incluir como GAP-XXX? | Exemplo |
|------|----------------------|---------|
| Competência, taxas, elegibilidade, migração do sistema legado, integrações obrigatórias, SLAs percebidos pelo usuário final, checklist documental, conflito entre normas | **Sim** — prioridade máxima | «Quem analisa quando há sobreposição entre apólice avulsa e contrato-mestre?» |
| Auth OIDC, estado do React Router, MSW, modularização de componentes, escolha ORM | **Não** neste fluxo | Registar apenas em “Encaminhamento engenharia” ou documento fora do `gaps.md` |
| Lacuna porque o **protótipo não implementou** funcionalidade | **Não** como GAP — em fidelidade Baixa/Média é esperado; em fidelidade **Alta** é defeito do protótipo (`SCREEN_INVENTORY_COMPLETE`) → devolver ao `spec-prototype` | Só GAP se a **regra de negócio** para o produto final estiver indefinida |

**Quota mínima:** para projetos com volume normativo alto (ex.: seguros, tributário, setores regulados), produzir **≥ 12 GAPs de negócio** na Etapa A ou justificar na capa por que há menos (ex.: cliente já fechou workshops).

---

## Etapa A — Auditoria Ativa

### O que o agente faz nesta fase

Varre sistematicamente **todos os artefatos existentes** em `outputs/spec/` e levanta:

- Inconsistências entre documentos
- Cenários de negócio não cobertos pelos RF
- Regras de negócio sem reflexo na UI
- Jornadas da persona sem cobertura no protótipo
- Dados mensuráveis prometidos sem baseline definido
- Pontos cegos típicos de discovery (o que o consultor provavelmente não perguntou)

Como base da varredura, executar `python3 ../tools/extract-gaps.py` (caminho relativo ao
SKILL.md, conforme [`../tools/references/paths.md`](../tools/references/paths.md)) — ele extrai de
uma só vez todos os GAPs pendentes de todos os arquivos. Quando existe `outputs/explore/gaps.md`
(projeto vindo do Explore do harness Elo), o script lê esse arquivo também, conta uma vez só o GAP
que está nos dois e fecha a saída com os GAPs abertos de lá que ainda não chegaram ao Plan — ver
«Projeto vindo do Explore» abaixo. Script indisponível → registrar
`TOOL_UNAVAILABLE:extract-gaps` no `sync-log.md` e varrer os arquivos manualmente.

### Roteiro de varredura

| Artefato | O que checar |
|----------|-------------|
| `outputs/explore/gaps.md` *(projeto vindo do Explore)* | GAP `⏳ Aguardando` ou `🟡 Parcialmente` ainda fora do `gaps.md` do Plan — a última linha do `extract-gaps.py` os lista; importar conforme «Projeto vindo do Explore» |
| `context-map.md` | F-xxx sem domínio atribuído; INF-xxx de alto risco não confirmados; contradições sem resolução; `NCR` (itens não classificados) ainda sem triagem |
| `discovery-document.md` | Pedidos da Seção 4 sem RF correspondente nem GAP; fatores da Seção 7 (Contexto Organizacional) de impacto alto sem GAP |
| `legacy.md` *(se existir)* | Dimensões com GAP em aberto; RN sem ligação a fluxo; KPIs sem baseline |
| `benchmark.md` | Gaps de paridade sem RF correspondente; tendências sem impacto mapeado no roadmap |
| `product-vision.md` | OKR sem baseline; personas sem JTBD; Não É vazio; roadmap sem priorização de valor |
| `business-rules.md` | RN do legado sem status no novo produto; RN nova sem origem; conflitos não resolvidos |
| `requirements.md` | RF sem 3 BDD; RNF sem métrica; RFs Must sem correspondência no roadmap Now; **buracos por módulo** — linha no índice modular sem RF Must e sem GAP na coluna Lacunas; seções `## Módulo:` em falta para módulos com RF; matriz insumo→RF com linhas órfãs; IDs RF fora do padrão `RF-MOD-XXX-NN` sem justificativa no kickoff |
| `product-requirements.md` | PR sem RF ligado; estados de UI incompletos; TTFV ausente |
| `prototype.md` *(se existir)* | Rotas sem linha na tabela UI→negócio; RN-NOVO-xxx não refletidas; estados faltando |
| `src/` *(se existir)* | Componentes sem linha em prototype.md; lógica de negócio sem RN documentada |
| **Colheita do protótipo** *(se existir protótipo)* | Inventário real de telas × `flow-map.md` × PRs — três camadas (manifesto → runtime → estático); ver «Colheita do protótipo» abaixo |
| `flow-map.md` *(se existir)* | Avisos do `check-flowmap.py` (telas órfãs, fluxos sem etapas, estados sem tela) ainda sem tratamento/justificativa na seção `## Cobertura` |
| **Auditoria da amarração técnica** *(só quando as fases técnicas já rodaram — existe `data-model.json` e/ou `api-contracts.yaml`)* | Avisos e métricas do `check-flowmap.py --data-model`/`--contracts` sobre a `## Amarração Técnica` — ver «Auditoria da amarração técnica» abaixo |
| `hld.md` *(se existir)* | Avisos do `check-hld.py` (container órfão, ADR sem alternativa, decisão das rules sem ADR, delta AS-IS ausente no brownfield) ainda sem tratamento na seção `## Cobertura`; RNF com «Risco aceito» sem dono nem data de revisão; módulo `N/A` na decomposição que voltou ao escopo |
| `modules.md` *(se existir)* | Módulos sem correspondência em `requirements.md`/`business-rules.md`/`product-requirements.md`; aliases divergentes |
| `design-system.md` *(se existir)* | Tokens/componentes sem uso refletido em `prototype.md` ou `product-requirements.md` |
| `## Questões em aberto` de qualquer artefato acima | Toda entrada `QA-NN` ainda sem conversão para `GAP-XXX`. Formato canônico da seção — mesma tabela `# / Pergunta / Evidência-contexto / Bloqueia próxima fase?` — definido em [`../tools/references/task-pipeline.md`](../tools/references/task-pipeline.md) §2; qualquer skill que grave `## Questões em aberto` fora desse formato é inconsistência a reportar |
| **Lint de prosa** (todos os `.md` de negócio acima) | Termos vagos/não-testáveis, referentes ambíguos e critérios de aceitação sem gatilho EARS — ver «Lint de prosa na varredura» abaixo |

### Lint de prosa na varredura (vale + estilos EngProc)

Parte obrigatória da varredura da Etapa A — o mesmo lint do Passo 4.5 da `spec-product`:

1. Rodar `vale` com os estilos `EngProc` sobre os artefatos de negócio auditados
   (`requirements.md`, `product-requirements.md`, `business-rules.md`, `product-vision.md`).
   Setup do `.vale.ini` e instalação em [`../tools/vale-styles/README.md`](../tools/vale-styles/README.md).
   Confirmar que os estilos carregaram (`vale ls-config` mostrando o pacote `EngProc`) **antes** de
   aceitar o resultado — zero ocorrências com `StylesPath` errado é falso verde, não texto limpo.
2. **Modo degradado (Vale ausente):** seguir a política de
   [`../tools/references/tool-bootstrap.md`](../tools/references/tool-bootstrap.md) — **verificar
   (`vale --version`) → rota efêmera → degradar**. Rota efêmera: container
   `docker run --rm -v "$PWD:/docs" -w /docs jdkato/vale <arquivos>` (não muta o ambiente, dispensa
   aprovação). Instalação permanente só é **oferecida** ao consultor e roda com aprovação registrada
   (`TOOL_INSTALLED:vale`). Sem rota efêmera viável,
   registrar `TOOL_UNAVAILABLE:vale (motivo curto)` no `sync-log.md` e
   aplicar o dicionário manualmente via LLM, lendo
   [`../tools/vale-styles/EngProc/Ambiguidade.yml`](../tools/vale-styles/EngProc/Ambiguidade.yml)
   (fonte canônica da lista de termos) — achados marcados com `[lint-llm]`. Nunca é bloqueante.
3. **Achados entram no Relatório de Revisão como perguntas ao consultor**, com o trecho citado:
   - Termo não-testável em RF `Must` ou em critério de aceitação (`EngProc.Ambiguidade`/`EngProc.EARS`) → 🟡 inconsistência — ex.: «RF-MOD-PAG-003 exige resposta "rápida" → **Pergunta:** qual o tempo máximo aceitável (s) e em que percentil?»
   - Demais ocorrências (termo vago em texto de apoio, `EngProc.PronomesVagos`) → ⚪ melhoria de qualidade
4. Registrar no `sync-log.md`, junto da linha da Etapa A: `PROSE_LINTED: ocorrencias=<N> · modo=<vale|llm>`.

### Colheita do protótipo (quando existe protótipo)

Parte da varredura da Etapa A — só roda quando existe protótipo (`prototype.md` ou diretório de protótipo, ex.: `src/`). O protótipo pode ser HTML puro, React ou qualquer stack (inclusive gerado por skills custom de projeto) — a colheita **nunca assume formato de código-fonte**. Três camadas, na ordem; usar a primeira viável:

**Camada a — Manifesto (preferida).** Existe `outputs/spec/screens-manifest.json` (contrato em [`../tools/references/screens-manifest.md`](../tools/references/screens-manifest.md); exemplo em [`../tools/references/screens-manifest.example.json`](../tools/references/screens-manifest.example.json))? Rodar:

```bash
python3 ../tools/check-flowmap.py outputs/spec/flow-map.md --manifest outputs/spec/screens-manifest.json
```

Os `AVISO:` do cross-check são insumo direto do Relatório de Revisão. **Validador ausente** (script fora do espelho de skills, sem Python 3, timeout) → registrar `TOOL_UNAVAILABLE:check-flowmap (motivo curto)` no `sync-log.md` e fazer o cross-check tela/rota por leitura (marcado `[colheita-llm]`, como a camada c) — nunca tratar ferramenta ausente como flow-map inválido.

**Camada b — Runtime (sem manifesto, protótipo executável em navegador).** Servir o protótipo e inventariar o DOM renderizado **rota a rota** (Playwright MCP ou `npx playwright`), gerando o próprio `outputs/spec/screens-manifest.json` com `"generatedBy": "spec-iterate/colheita-runtime"` e aproveitando para capturar screenshots faltantes em `outputs/spec/screens/`. Depois, rodar o cross-check da camada a sobre o manifesto gerado. Playwright indisponível → registrar `TOOL_UNAVAILABLE:playwright` no `sync-log.md` e cair para a camada c.

**Camada c — Estático (melhor esforço).** Parse dos arquivos do protótipo pelo modelo (rotas, campos, ações e estados inferidos do markup/código); gerar o manifesto marcado com `"partial": true`, registrar `HARVEST_PARTIAL` no `sync-log.md` e rodar o cross-check da camada a sobre o manifesto parcial.

**Modo degradado (`camada=skipped`):** protótipo existe mas nenhuma camada é viável (ex.: só Figma/prints, ou `flow-map.md` ausente por `FLOWMAP_SKIPPED`) — justificar no `sync-log.md`.

**Cruzamentos que geram perguntas/GAPs no Relatório de Revisão** (P-xxx → GAP-XXX pela regra de mapeamento; formato padrão de 13 campos):

| Cruzamento | Como detectar |
|------------|---------------|
| Tela no protótipo ausente do flow-map/PR | **Determinístico** — aviso «manifesto: tela ... ausente do flow-map» do `check-flowmap.py --manifest` |
| Tela no flow-map sem protótipo | **Determinístico** — aviso «flow-map: tela TEL-xxx ausente do manifesto» |
| Rota divergente (mesmo TEL, rotas diferentes) | **Determinístico** — aviso «rota divergente para TEL-xxx» |
| Campo presente na tela e ausente do PR correspondente (e vice-versa) | **Análise do modelo** — `fields[]` do manifesto × PR da tela em `product-requirements.md` (o campo «Etapa do fluxo» liga PR ↔ ETP/TEL) |
| Ação/estado da tela sem RN/cenário | **Análise do modelo** — `actions[]`/`states[]` do manifesto × `business-rules.md` / cenários BDD de `requirements.md` |

Deixar explícito no Relatório: o cross-check **tela/rota é determinístico** (match por `id` OU por `route` no `check-flowmap.py --manifest`); o nível **campo/ação/estado é análise do modelo** sobre o manifesto — marcar esses achados com `[colheita-llm]`.

**Registro no sync-log** (gate WARNING `PROTOTYPE_HARVESTED`), junto da linha da Etapa A:
`PROTOTYPE_HARVESTED: camada=<manifest|runtime|static|skipped> · telas_manifesto=<N> · avisos_crosscheck=<M>`

### Auditoria da amarração técnica (quando as fases técnicas já rodaram)

Parte da varredura da Etapa A — **só roda quando** existe `outputs/spec/data-model.json` e/ou `outputs/spec/api-contracts.yaml` (Fases 6a/6b já executadas). Rodar o `check-flowmap.py` passando **apenas as flags cujos arquivos existem**:

```bash
python3 ../tools/check-flowmap.py outputs/spec/flow-map.md \
  --data-model outputs/spec/data-model.json --contracts outputs/spec/api-contracts.yaml
```

Os `AVISO:` e as métricas do cross-check são insumo direto do Relatório de Revisão — todos os cruzamentos são **determinísticos** (saída do script):

| Cruzamento | Como detectar | Vira pergunta/GAP quando |
|------------|---------------|--------------------------|
| Tela de fluxo sem entidade/endpoint amarrado | Métrica `% telas com amarração` < 100% (telas de `## Telas` ausentes da `## Amarração Técnica`, ou linha só com `—`) | Sempre — pergunta: «que entidade(s) e endpoint(s) sustentam a tela TEL-xxx?» (a tela pode ser legitimamente estática — resposta registra `—` justificado) |
| Endpoint órfão do contrato | `endpoints órfãos (no contrato, sem amarração)` com `--contracts` | Só se **não houver justificativa no `sync-log.md`** (ex.: endpoint interno/batch sem UI) — caso contrário citar a justificativa no Relatório |
| Entidade citada que não existe no data-model | `AVISO: amarração TEL-xxx: entidade «X» não existe no data-model` com `--data-model` | Sempre — **drift pós-mudança**: a amarração referencia entidade renomeada/removida na Fase 7a |
| Entidade do data-model sem tela | `entidades do data-model sem tela` com `--data-model` | Só quando a entidade participa de jornada com UI esperada (análise do modelo — marcar `[amarracao-llm]`) |

**Registro no sync-log** (gate WARNING `UI_BINDING_AUDITED`), junto da linha da Etapa A:
`UI_BINDING_AUDITED: data_model=<sim|não> · contracts=<sim|não> · pct_amarracao=<N>% · avisos=<M>`

*(`## Amarração Técnica` ausente do flow-map com fases técnicas já rodadas → isso é em si um achado 🟡: as Fases 6a/6b deveriam tê-la preenchido.)*

### Pontos cegos típicos de discovery

O agente deve checar **proativamente** estes cenários frequentemente esquecidos:

| Categoria | Pergunta de auditoria |
|-----------|----------------------|
| **Offboarding / cancelamento** | O produto define o que acontece quando um usuário sai, cancela ou é desativado? |
| **Casos de volume extremo** | O produto define comportamento com 0 registros e com volume 10x acima do esperado? |
| **Permissões e papéis** | Todos os RF definem quem pode e quem não pode executar a ação? |
| **Auditoria e rastreabilidade** | Ações críticas (exclusão, estorno, aprovação) têm log de quem fez o quê e quando? |
| **Comportamento em falha de integração** | O que acontece quando um sistema externo está fora do ar? |
| **Migração de dados** | Se há legado, como os dados existentes entram no novo produto? |
| **Notificações e comunicação** | Quem é notificado sobre o quê, como e com qual frequência? |
| **Internacionalização e localização** | O produto define idioma, fuso, formato de data e moeda? |
| **Acessibilidade** | WCAG AA foi checado em telas críticas ou só mencionado genericamente? |
| **Expiração e validade** | Registros, tokens, sessões, aprovações — têm prazo de validade definido? |

### Saída da Etapa A — Relatório de Revisão

Gerar um documento de revisão **direcionado ao consultor**, não ao stakeholder. Tom direto, como colega de projeto:

```markdown
## Relatório de Revisão — [Nome do Projeto]
Data: YYYY-MM-DD
Artefatos revisados: [lista]

---

### 🔴 Problemas críticos (bloqueiam lançamento ou criam risco alto)

**[P-001] RF-PAG-001 não tem critério de aceite para falha de gateway**
O cenário 3 (erro) do RF-PAG-001 diz apenas "mostrar erro" sem definir se a transação é revertida,
se o usuário é notificado, ou se há retry automático.
→ **Pergunta para o consultor:** quando o gateway de pagamento retorna erro, a transação deve ser:
  a) revertida automaticamente, b) mantida em fila para retry, ou c) marcada como falha manual?

---

### 🟡 Inconsistências entre documentos

**[P-002] RN-NOVO-COB-001 contradiz prototype.md /cobranca/novo**
A regra diz que boleto vencido bloqueia novo pedido, mas o protótipo permite criar pedido mesmo
com boleto em atraso (sem validação visível na rota /cobranca/novo).
→ **Pergunta:** a validação deve acontecer: a) no momento de criar pedido, b) no checkout, ou c) só no pagamento?

---

### 🔵 Pontos cegos identificados

**[P-003] Comportamento de offboarding não definido**
Nenhum artefato define o que acontece quando um usuário tem a conta desativada:
sessões ativas são encerradas? dados são retidos? notificação é enviada?
→ **Pergunta:** descreva o que deve acontecer quando um usuário é desativado por um admin.

---

### ⚪ Melhorias de qualidade (não bloqueiam)

**[P-004] KPI "tempo médio de processamento" sem baseline**
O KPI existe em legacy.md Dim. 3 mas não tem valor atual registrado.
→ **Pergunta:** qual é o tempo médio hoje? (Estimativa aceita — registrar como INF-xxx)

---

**Total:** X críticos · Y inconsistências · Z pontos cegos · W melhorias
**Próximo passo:** preencher `outputs/spec/gaps-answers.md` com as respostas ou responder no chat.
```

### Regra de mapeamento P-xxx ↔ GAP-XXX

- Todo `P-xxx` classificado como 🔴 crítico, 🟡 inconsistência ou 🔵 ponto-cego gera **exatamente um** `GAP-XXX` em `gaps.md`, registrando `Origem: P-xxx` no campo **Fonte** do GAP.
- `P-xxx` ⚪ (melhoria de qualidade) só vira `GAP-XXX` por **decisão explícita do consultor** — caso contrário permanece registrado apenas no Relatório de Revisão, sem numeração formal.
- IDs `GAP-XXX` são **sequenciais e globais** ao projeto (não reiniciam por artefato, por seção nem por rodada de auditoria) — continuar a numeração a partir do maior `GAP-XXX` já existente em `gaps.md` (em projeto vindo do Explore, o maior dos dois arquivos — ver abaixo).
- Mesma regra vale para entradas convertidas de `## Questões em aberto` de outros artefatos (ver `../tools/references/task-pipeline.md` §2.16): campo **Fonte** recebe `Origem: <artefato>#<n>`.

### Projeto vindo do Explore — a ponte dos GAPs

Num projeto do harness Elo, o pré-projeto (fase Explore) já tem um registro de questões abertas:
`outputs/explore/gaps.md`, tabela de cinco colunas (ID, Descrição, Status, Impacto, Responsável).
Ele fica **congelado** quando a `spec-product` termina e não se edita mais — o registro vivo passa a
ser o `gaps.md` desta skill, em `outputs/spec/`. A passagem de um para o outro acontece na
**primeira rodada** desta skill no Plan:

1. Importar para o `gaps.md` do Plan todo GAP do Explore com status `⏳ Aguardando` ou
   `🟡 Parcialmente`, com o **mesmo número** (o `GAP-003` do Explore continua `GAP-003`), os 13
   campos preenchidos a partir da linha de lá e `Origem: outputs/explore/gaps.md#GAP-003` no campo
   **Fonte**. Renumerar quebra o rastreio: atas, protótipo e documentos do Explore citam o número
   antigo.
2. GAP `✅ Respondido` no Explore não é importado — a decisão já está nos documentos do Explore, que
   a `spec-ingest` leu. O número dele continua ocupado.
3. GAP novo desta rodada continua a numeração a partir do maior `GAP-XXX` dos dois arquivos. Assim
   nenhum número do Explore é reaproveitado para outra pergunta.
4. Conferir com o `extract-gaps.py`: a última linha da saída diz «Todos os GAPs abertos do Explore já
   estão em outputs/spec» quando a ponte está completa, ou lista os que faltam.

Sem `outputs/explore/gaps.md` (projeto que não passou pelo Explore), esta seção não se aplica.

---

## Etapa B — Resposta e Propagação

### Como o consultor responde

O consultor tem três caminhos para responder. **O caminho C é o fluxo normal de iteração contínua** — nova informação chega o tempo todo durante um discovery.

**Caminho A — Resposta no chat:**
Colar as respostas por ID (P-001: "a transação deve ser revertida..."). O agente atualiza `gaps.md` e propaga imediatamente.

**Caminho B — `gaps-answers.md`:**
Preencher o arquivo de respostas (ver estrutura abaixo). Na próxima invocação de `spec-iterate`, pedir: "propagar respostas de gaps-answers.md".

**Caminho C — Nova evidência (texto, documento ou protótipo) — fluxo principal de iteração:**

Este é o caminho mais comum. Toda vez que chega uma nova ata, transcrição, documento ou decisão:

1. Rodar `spec-ingest` **em modo delta** (só as novas fontes) → gera novos F-xxx e atualiza contradições
2. Rodar `spec-iterate` → audita o impacto dos novos F-xxx nos artefatos existentes
3. Propagar cirurgicamente apenas os artefatos afetados — não rerrodar `spec-product` inteiro

**Quando rerrodar `spec-product`:** somente se o iterate detectar um GAP de **severidade CRÍTICA** que implique mudança estrutural — novo módulo inteiro, virada de escopo, nova persona principal. O iterate deixará isso explícito com a tag `⚠️ REQUER spec-product`. (`spec-product` é caro — 5 artefatos grandes, incluindo `modules.md`; na grande maioria das iterações a propagação cirúrgica basta.)

Se a evidência vem como alteração em Figma/src/ → rodar `spec-prototype` (Análise); extrair decisões como F-xxx; depois fechar.

### Critério de "resposta válida" (Etapa B)

Uma resposta em `gaps-answers.md` ou no chat só é **válida** quando contém, na mesma entrada, os quatro elementos: **decisão concreta** + **decisor** (nome/papel) + **data** + **valor ou regra específica**. Faltando qualquer um dos quatro, a resposta é tratada como vaga (ver § Critérios de fechamento) e o GAP permanece `Status: aberto`.

❌ **Inválida:** "Ok, pode seguir como sugerido." — sem decisor nomeado, sem data, sem valor específico.
✅ **Válida:** "A transação deve ser revertida automaticamente em até 30 min, com no máximo 3 tentativas de retry. — Decisão de Maria Costa (Head de Pagamentos), 2026-07-08."

### Estrutura do `gaps-answers.md`

Molde completo em [`templates/gaps-answers.md`](templates/gaps-answers.md). Um bloco por pergunta:

```markdown
## P-001 — RF-PAG-001 falha de gateway
**Resposta:** a transação deve ser revertida automaticamente. O usuário recebe e-mail de notificação.
Retry automático após 30 minutos (máx. 3 tentativas).
**Novo F-xxx gerado?** Não — decisão tomada em reunião interna (registrar como CHAT-YYYYMMDD-1)
**Artefatos afetados:** requirements.md §RF-PAG-001 (Cenário 3), business-rules.md (nova RN-NOVO-PAG-xxx), prototype.md (estado de erro /pagamentos/novo)
```

Resposta ainda pendente fica registrada como `**Resposta:** [PENDENTE — levar para cliente]`.

### Propagação automática após respostas

Para cada resposta em `gaps-answers.md` (ou no chat):

1. **Comparar resposta vs. `Sugestão de tratamento` registrada no GAP:**
   - Se a resposta **confirma** a sugestão → propagar conforme planejado em `Sugestão de artefato`
   - Se a resposta **diverge** da sugestão → registrar a divergência no campo `Decisão consolidada` (a resposta vence; a sugestão era hipótese do agente)
   - Se a resposta é **vaga** ou só "ok" sem detalhe → GAP permanece aberto; pedir resposta acionável
2. **Criar ou atualizar GAP-XXX** em `gaps.md` com decisão registrada e indicação de aderência à sugestão (`seguiu sugestão` / `divergiu` / `superou escopo`)
3. **Atualizar todos os artefatos listados em "Artefatos afetados":**
   - `business-rules.md` → adicionar/ajustar RN-NOVO-xxx
   - `requirements.md` → corrigir cenário BDD ou RNF
   - `prototype.md` → atualizar tabela UI→negócio ou estados
   - `product-requirements.md` → atualizar estados de UI ou PR
   - `flow-map.md` → criar/ajustar TEL/ETP/TRS afetados e **revalidar com `python3 ../tools/check-flowmap.py outputs/spec/flow-map.md` até exit 0**
   - `modules.md` → atualizar se a decisão alterar catálogo modular (raro)
4. **Registrar em `sync-log.md`** no mesmo turno, incluindo coluna `Decisor` (consultor / cliente / nome)

**GAPs de colheita (origem na «Colheita do protótipo» da Etapa A):** quando a resposta fecha um GAP de colheita, a propagação atinge explicitamente **três destinos** — (1) `flow-map.md`: criar/ajustar telas, etapas e transições e revalidar como no item 3 acima; (2) `product-requirements.md`: campos, ações e estados do PR da tela (incluindo o campo «Etapa do fluxo»); (3) `prototype.md`: tabela UI→negócio e estados. Registrar a direção na Seção B (`proto→doc` ou `doc→proto`).

**GAPs de amarração (origem na «Auditoria da amarração técnica» da Etapa A):** o fechamento propaga para a seção `## Amarração Técnica` do `flow-map.md` (adicionar/corrigir linha `| Tela | Entidades | Endpoints |`) e revalida como no item 3, repassando `--data-model`/`--contracts`. Quando a decisão implica mudança no próprio `data-model.json` ou `api-contracts.yaml` (nova entidade, endpoint novo/renomeado), **a mudança técnica em si é das skills 6a (`spec-data-model`) / 6b (`spec-api-contracts`)** — o iterate registra o encaminhamento no GAP e no `sync-log.md` (direção `doc→doc`) e ajusta apenas a amarração; endpoint órfão aceito como sem UI ganha justificativa registrada no `sync-log.md`.

---

## Formato GAP-XXX em `gaps.md`

Tabela de **13 campos** por GAP — bloco pronto em [`templates/gaps.md`](templates/gaps.md):
Tipo · Severidade · Status · Tema · Descrição · Impacto se não resolvido · Perguntas para o
negócio (fechadas) · Dono sugerido · **Sugestão de tratamento** · Sugestão de artefato · Afeta ·
Features bloqueadas · Fonte. (Gate `GAP_13_FIELDS`.)

### Heurística de severidade

| Severidade | Quando usar | SLA de resposta |
|------------|-------------|------------------|
| `CRÍTICA` | Bloqueia lançamento, compliance, ou decisão build/buy | Responder **antes da próxima skill** ser executada |
| `ALTA` | Bloqueia RF/RNF Must ou jornada crítica | **≤ 1 semana** |
| `MÉDIA` | Permite rascunho mas afeta UX ou operação | Próximo ciclo de iteração |
| `BAIXA` | Melhora precisão futura; não bloqueia entrega atual | Próximo ciclo de iteração |

### Priorização de GAPs

Não só por severidade — usar a matriz:

| | Impacto alto | Impacto baixo |
|-|--------------|---------------|
| **Urgente resposta** | 🔴 Resolver ANTES da próxima reunião | 🟡 Resolver nesta iteração |
| **Pode esperar** | 🟡 Resolver na próxima iteração | ⚪ Backlog de qualidade |

**Critério de urgência:** GAP que bloqueia reunião com cliente ou demo > GAP que só afeta qualidade de doc.

### Priorização ICE (ordenação dentro de cada severidade)

Além da matriz urgência × impacto e do SLA por severidade, ordenar as linhas de `gaps.md` **dentro de cada severidade** pelo score ICE:

`ICE = Impacto (1-5: nº de artefatos afetados + bloqueia fase?) × Confiança (1-5: força da evidência) × Facilidade (1-5: inverso do esforço)`

| Dimensão | 1 (baixo) | 5 (alto) |
|----------|-----------|----------|
| Impacto | 1 artefato afetado, não bloqueia fase | ≥4 artefatos afetados ou bloqueia a próxima fase |
| Confiança | Suposição do agente sem evidência | `F-xxx` direto + confirmação do consultor |
| Facilidade | Exige workshop/pesquisa externa | Resposta de 1 frase do consultor fecha o GAP |

Registrar o score (`ICE: I × C × F = N`) no campo **Sugestão de tratamento** do GAP. Dentro da mesma severidade, o GAP com maior ICE aparece primeiro em `gaps.md`.

---

## `sync-log.md` — Memória cronológica do projeto

O formato canônico das duas seções (A — timeline de execuções, 9 colunas incluindo `Decisor` e
`Modo / contexto`; B — propagações de GAP com direção `doc→proto` · `proto→doc` · `doc→doc`),
com exemplos e convenções, vive em [`templates/sync-log.md`](templates/sync-log.md) — esta skill
é a dona do template.

> **Regra cross-cutting:** toda skill do pacote `spec-*` lê a Seção A no início (entender contexto) e adiciona linha na Seção A ao terminar (preservar continuidade). `spec-iterate` é responsável pela Seção B; outras skills só tocam a Seção B se propagarem GAP no escopo da própria execução.

---

## Ciclo de fecho (6 passos)

```
1. Identificar  →  Etapa A: auditoria ativa pelo agente
2. Priorizar    →  Matriz urgência × impacto
3. Responder    →  Consultor preenche gaps-answers.md ou responde no chat
4. Propagar     →  Agente atualiza TODOS os arquivos em "Afeta"
5. Fechar       →  Status → "resolvido"
6. Sync-log     →  Entrada em sync-log.md no MESMO turno
```

### Critérios de fechamento

Os do § **Critério de "resposta válida"** (os 4 elementos) + artefato derivado criado e vinculado
+ entrada no `sync-log.md` — verificados por `PROPAGATION_COMPLETE` e `SYNC_LOG_UPDATED`.

---

## Entregável final (quando ciclo está completo)

Após GAPs críticos/altos fechados ou aceitos como bloqueio, gerar um **resumo executivo do pacote** para o cliente:

```markdown
## Pacote de Discovery — [Nome do Projeto]
Data de fechamento: YYYY-MM-DD

### O que foi descoberto
- [Top 3 achados de negócio mais relevantes]

### O que o produto vai ser
- [Visão em formato Moore — 1 parágrafo]

### Gaps em aberto (aceitos)
- [Lista de GAPs que ficaram sem decisão e por quê]

### Próximos passos
- [ ] Planejamento técnico do TO-BE (fase posterior)
- [ ] Geração de backlog no ADO (fase posterior)
- [ ] [outros passos específicos do projeto]
```

---

## Saídas

| Arquivo | Template |
|---------|---------|
| `outputs/spec/gaps.md` | [`templates/gaps.md`](templates/gaps.md) |
| `outputs/spec/gaps-answers.md` | *(criado pelo consultor com base no Relatório de Revisão)* |
| `outputs/spec/sync-log.md` | [`templates/sync-log.md`](templates/sync-log.md) |
| `outputs/spec/screens-manifest.json` *(só camadas runtime/estático da colheita, quando o protótipo não emitiu o seu)* | contrato: [`../tools/references/screens-manifest.md`](../tools/references/screens-manifest.md) · exemplo: [`../tools/references/screens-manifest.example.json`](../tools/references/screens-manifest.example.json) |

---

## Definição de pronto

A lista de fechamento são os **Validators** abaixo — conferir cada código FATAL e WARNING um a um.
Itens sem validator próprio:

- [ ] Cada GAP com prioridade na matriz urgência × impacto (e score ICE dentro da severidade)
- [ ] `gaps-answers.md` criado para o consultor responder
- [ ] GAPs CRÍTICA/ALTA: resolvidos ou marcados `⚠️ BLOQUEADO` nos artefatos afetados
- [ ] Resumo executivo do pacote gerado quando o ciclo está completo

---

## Anti-padrões

| Anti-padrão | Por que evitar |
|-------------|----------------|
| Gerar GAPs sem varrer todos os artefatos | Auditoria parcial deixa problemas escondidos |
| Fechar GAP sem propagar | Decisão fica órfã; outros artefatos continuam errados |
| Resposta vaga em Answers | Manter GAP aberto até decisão acionável |
| Pular sync-log | Sem rastro de quando/quem mudou o quê |
| Não checar pontos cegos típicos | Os maiores riscos são o que ninguém lembrou de perguntar |
| Tentar gerar work items / ADO | Backlog é fase posterior |

---

## Validators (FATAL / WARNING)

### FATAL — bloqueia handoff (não gravar `gaps.md` como concluído, não registrar no sync-log)

| Código | Verificação |
|--------|-------------|
| `FASE1_SCAN_COMPLETE` | Roteiro de varredura executado sobre **todos** os artefatos existentes em `outputs/spec/` (tabela da Etapa A) |
| `GAP_13_FIELDS` | Todo `GAP-XXX` em `gaps.md` tem os 13 campos preenchidos, incluindo **Sugestão de tratamento** |
| `PXXX_TO_GAP_MAPPED` | Todo `P-xxx` 🔴/🟡/🔵 do Relatório de Revisão tem `GAP-XXX` correspondente com `Origem: P-xxx` no campo Fonte |
| `GAP_ID_SEQUENTIAL_GLOBAL` | Numeração `GAP-XXX` sequencial e global (sem reinício por artefato ou rodada) |
| `EXPLORE_GAPS_IMPORTED` | *(projeto vindo do Explore)* Todo GAP `⏳ Aguardando`/`🟡 Parcialmente` de `outputs/explore/gaps.md` está no `gaps.md` do Plan com o mesmo número e `Origem:` no campo Fonte — a última linha do `extract-gaps.py` não lista nenhum pendente |
| `PROPAGATION_COMPLETE` | Toda resposta em `gaps-answers.md`/chat propagada para **todos** os arquivos listados em "Afeta" antes de marcar `Status: resolvido` |
| `SYNC_LOG_UPDATED` | Linha adicionada na Seção A (execução) e, se houve propagação, na Seção B (por GAP) no mesmo turno |

### WARNING — não bloqueia; sinalizar no Relatório de Revisão

| Código | Verificação |
|--------|-------------|
| `MIN_12_BUSINESS_GAPS` | Projetos com volume normativo alto produziram ≥ 12 GAPs de negócio na Etapa A, ou a capa justifica o número menor |
| `BLIND_SPOTS_CHECKED` | Tabela de 10 pontos cegos típicos checada explicitamente |
| `PROSE_LINTED` | Lint de prosa (vale/estilos `EngProc`, ou modo degradado `TOOL_UNAVAILABLE:vale` + dicionário de `Ambiguidade.yml` via LLM) rodado na varredura, com achados no Relatório de Revisão |
| `PROTOTYPE_HARVESTED` | *(quando existe protótipo)* Colheita executada e registrada no sync-log — formato da linha na seção «Colheita do protótipo» |
| `UI_BINDING_AUDITED` | *(quando existe `data-model.json` e/ou `api-contracts.yaml`)* Auditoria da amarração executada e registrada no sync-log — formato da linha na seção «Auditoria da amarração técnica»; avisos convertidos em perguntas/GAPs |
| `VAGUE_ANSWERS_FLAGGED` | Respostas vagas em `gaps-answers.md` mantidas com `Status: aberto` em vez de fechadas |
| `REQUER_SPEC_PRODUCT_TAGGED` | GAP crítico com mudança estrutural (novo módulo, virada de escopo, nova persona principal) sinalizado com `⚠️ REQUER spec-product` |

---

## O que NÃO faz

- Não gera work items, tasks ou backlog no ADO — isso é fase posterior (`spec-tasks` em diante)
- Não rerroda `spec-product` inteiro para cada nova fonte de informação — só quando um GAP crítico exigir mudança estrutural (`⚠️ REQUER spec-product`)
- Não trata dívida técnica do protótipo (auth, roteamento, ORM, modularização de componentes) como `GAP-XXX` de negócio
- Não define arquitetura TO-BE, RNF técnico profundo nem contratos de API — isso é da cadeia técnica pós-discovery (`spec-tech-rules` em diante)

---

## Skills irmãs

| Skill | Consome | Produz |
|-------|---------|--------|
| `spec-ingest` | — | `context-map.md`, `discovery-document.md` — fontes da auditoria; modo delta alimenta novas rodadas |
| `spec-legacy` | — | `legacy.md`, `architecture.md`, `legacy-analysis.md`, `threat-model.md` — auditados quando existem |
| `spec-benchmark` | — | `benchmark.md` — auditado por gaps de paridade sem RF |
| `spec-product` | GAP crítico com tag `⚠️ REQUER spec-product` | `product-vision.md`, `business-rules.md`, `requirements.md`, `product-requirements.md` — auditados e corrigidos cirurgicamente |
| `spec-prototype` | — | `prototype.md`, `src/`, `screens-manifest.json` — auditados (colheita do protótipo); inconsistências viram `GAP-XXX` |
| `spec-report` | `gaps.md`, `sync-log.md` | Sumário executivo da capa (top GAPs críticos) |
| `spec-tasks` | `gaps-document.md` (mecanismo próprio de GAP na Fase 8) | — (não é dono de `gaps.md`; usa seu próprio arquivo) |
