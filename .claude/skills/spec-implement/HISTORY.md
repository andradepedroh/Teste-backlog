# spec-implement — Histórico

> Extraído do `SKILL.md` para não ser pago em tokens a cada invocação. Nada aqui muda o que
> o agente faz; tudo aqui explica **por que** as regras do `SKILL.md` são como são.
> Consultar ao mexer nos validators ou ao questionar a severidade de um gate.

## Changelog

### 2.4 — 2026-10-20 (harness-elo-v2, bifurcação nossa)

O formato, as regras de escrita, o exemplo preenchido, a checagem e a relação com os outros
relatórios do **passo J** saíram para `references/devolutiva.md`, lido no passo J (plano de
melhoria das skills do harness, Onda 4). A obrigação, o público e o porquê ficam no SKILL.md. As
mudanças de 2.2 a 2.4 — o G3 (validação independente) e o passo J para quem não é técnico — estão
registradas no `MANUTENCAO.md` do harness.

**Revisão do G3 (2026-10-21, ainda na 2.4).** O que mudou no texto da skill, e por quê:

- **E1, passo 6 — linha de base dos comandos**, antes de qualquer código
  (`validar.mjs linha-de-base`), e `--linha-de-base` no `iniciar`. Um teste vermelho antigo ou o lint
  do repositório inteiro bloqueavam toda task até PARADO, e o corretor gastava rodadas no que não era
  dele. A falha igual à de antes vira `VALIDACAO_FALHA_PRE_EXISTENTE` (WARNING); linha de falha nova
  continua bloqueando.
- **`--cmd-build`** no G3: depois do corretor ninguém rodava o build de novo.
- **Shell no Windows:** os comandos rodam no Git Bash (o do G2), não no `cmd.exe`, onde `./mvnw test`
  e `CI=true npm test` falhavam sempre.
- **`parar` tem saída**, no próprio G3: comentário dos bloqueantes no work item com o estado
  inalterado, devolutiva do J em modo falha, diff das edições do corretor com a pergunta manter ou
  descartar (nunca descartar sozinho), e em lote a próxima task espera. O FATAL
  `VALIDACAO_INDEPENDENTE_APROVADA` passou a dizer o que o H faz com `parar` (só o comentário), em vez
  de só proibir; o "não vai para Testing sem `fim`" ficou igual.
- **MÉDIO e BAIXO "não são avaliados no G3"**, dito assim no texto e no relatório: o contador
  `ignorados` (perto de zero) lia-se como "nenhum achado médio". Quem os cobre é a `auditoria-de-us`.

**Dependências, status da task e marcador da US (2026-10-21, ainda na 2.4).** Defeitos D48 e D49 do
teste ponta a ponta do harness. Os três passos ficaram num script do harness,
`.claude/ferramentas/andamento.mjs` (teste em `andamento.test.mjs`), porque a skill os deixava para a
memória do agente:

- **§ D2, antes da Fase 2 — `andamento.mjs conferir`.** A skill não lia `dependencies`,
  `executionOrder` nem `mustImplementFirst`: a TASK-003-001, que dependia da TASK-001-001 ainda
  `PENDING` e vinha depois da story transversal de segurança, foi implementada sem aviso. Agora a
  dependência aberta (declarada na task ou num nível acima dela — story, feature, epic —, fora do
  backlog, ou story `mustImplementFirst` com task aberta) manda **perguntar** antes de começar; task
  anterior na ordem do backlog é só aviso.
  FATAL `DEPENDENCIES_CHECKED`; WARNING `DEPENDENCY_PENDING` quando o usuário manda seguir. Em Mode A
  quem responde são os links de predecessora no Azure DevOps.
- **§ H (Mode B) — `andamento.mjs concluir`.** Terminada a task, o `tasks.json` seguia
  `status: "PENDING"` e só o `spec_story.md` sabia que ela fora feita — a próxima task não tinha como
  saber. Agora, com o G3 em `fim`, a task fica `status: "DONE"`. O script recusa sem o relatório do G3
  aprovado para a mesma task (spike conclui sem G3) e muda só esse campo. `DONE` porque o schema da
  `spec-tasks` deixa `status` livre com padrão `PENDING` e nenhuma skill do kit gravava outro valor;
  é o único que o `conferir` lê como concluído. Mode A não grava: o dono do estado é o board.
  FATAL `TASK_STATUS_RECORDED`.
- **§ D2 — `andamento.mjs abrir-us`.** Nenhuma skill nem rule mandava criar
  `outputs/spec/em-andamento.md`, mas a `auditoria-de-us` tem FATAL (`MARKER_CLEARED`) para apagá-lo e
  o `delivery-gate` o procura. Agora a `spec-implement` o cria na primeira task da US, a partir de
  `.claude/templates/em-andamento.md`, na raiz de artefatos do workspace (o repositório de docs, a
  mesma que o gate lê), e o commita na branch da US. FATAL `US_MARKER_OPEN`.

### 2.1 — 2026-08-21

Passo **J — devolutiva em chat** obrigatório nos dois modos: ao terminar, a skill explica em
português simples **o que mudou para o negócio** e **como o código faz isso**.

- **Buraco que fecha.** Os dois relatórios que a v2.0 já produzia são escritos para quem *não* é o
  leitor: o comentário do work item é registro de auditoria (pressupõe contexto) e o `spec_story.md`
  é memória factual e terse para o próximo agente. Nenhum dos dois explica nada a uma pessoa. Em
  Mode A, aliás, não havia relatório em chat nenhum — o agente comentava no ADO e terminava. O
  resultado era trabalho correto e ilegível: quem revisa ou dá manutenção recomeçava do zero.
- **Público declarado, não implícito:** um desenvolvedor recém-chegado ao projeto, com pouco
  conhecimento da stack e **nenhum** do negócio. Declarar o leitor é o que torna "linguagem simples"
  uma instrução executável em vez de um adjetivo.
- **Duas camadas obrigatórias na mesma mensagem** — negócio (o que o usuário passa a conseguir
  fazer, quais regras valem agora, o que ainda não faz) e técnico (caminho da informação, arquivos
  com o papel de cada um, decisões e motivos, onde olhar quando quebrar). Separar as duas é o que
  permite a mesma mensagem servir a um PO e a um dev.
- **Dez regras de escrita verificáveis**, porque "escreva simples" não é auditável e "explique toda
  sigla na primeira aparição" é. As que mais mudam o texto na prática: código de regra nunca
  substitui o texto da regra (`RN-012` sozinho não informa nada a quem não tem o documento aberto);
  nome de arquivo sempre com o papel dele; cada cenário de teste vira uma frase "quando X, o sistema
  Y", nunca um id ou nome de método.
- **Proibido o jargão desta própria skill** — "blueprint", "matriz de cenários", "gate", "FATAL",
  nomes de validator, nomes de camada de arquitetura. É vocabulário interno do processo, não do
  leitor. Era o risco concreto de a v2.0 vazar seu vocabulário para o relatório humano.
- **Exemplo preenchido no SKILL.md.** Uma descrição de tom não fixa granularidade; um exemplo sim.
  Foi o jeito mais barato de ancorar o nível de detalhe esperado em cada seção.
- **Checagem de três perguntas antes de enviar** (entende o que mudou? saberia onde começar a
  alterar? sobrou sigla sem explicação?) — releitura dirigida, não "revise".
- **Vale também quando falha.** Validação vermelha, bloqueio ou nada implementado continuam
  gerando devolutiva, com as seções ajustadas: o que se tentou, onde parou, o que a mensagem de erro
  quer dizer em português, o que precisa ser decidido. Falha explicada é entrega de informação.
- **Gate `CHAT_HANDOFF_DELIVERED` (FATAL)** + duas hard rules (nunca encerrar sem a devolutiva;
  nunca entregá-la em jargão). FATAL porque o relatório *é* a entrega ao usuário: sem ele a
  execução não terminou, apenas parou.
- **Não substitui nada.** Os três destinos coexistem, com públicos diferentes — tabela explícita na
  seção J. Em Mode A a devolutiva **acrescenta** ao comentário do ADO; em Mode B ela absorve os
  dados que iriam para o comentário (matriz, comandos, divergências), por ser o único relatório
  existente.

### 2.0 — 2026-08-19

Reconstrução estrutural: a skill passa a trabalhar **test-first**. A decisão do que será testado
é anterior ao código; a implementação vira "o que falta para essas provas passarem".

- **Defeito que motivou a mudança.** Na v1.3 a matriz de cenários existia — e era boa — mas vivia
  na seção "Validations (must run before state change)", ou seja, **depois** da etapa E
  (implementação) no Quick start. Na prática o agente chegava à matriz com a task já "funcionando",
  o caminho feliz já verificado à mão e o orçamento de atenção no fim. O resultado observado: teste
  escrito task a task de forma irregular, quase sempre só happy path, e às vezes nenhum. O texto
  proibia isso em três lugares (`ALL_SCENARIOS_TESTED`, `NEGATIVE_PATHS_COVERED`, hard rule do
  "never write only happy-path tests") — proibição não venceu a ordem de execução. **A correção é
  estrutural, não textual:** mover a matriz para antes do código e torná-la gate.
- **Fase 1 nova — Projeto de testes** (E1→E4), com nada de código de produção dentro dela:
  - **E1 — descoberta da estratégia de testes nas rules técnicas.** A skill agora **procura
    ativamente** a regra de testes (`test-strategy.mdc` e equivalentes, rules com `globs` de teste,
    seções "Testes" em outras rules) e extrai pirâmide, ferramentas, localização, threshold de
    cobertura, tipo de teste de integração, ferramenta de banco, E2E (ferramenta/escopo/fluxos
    críticos), carga (ferramenta/SLO) e anti-patterns. Depois **confirma o comando real** no
    repositório (`package.json`, `pom.xml`, `pyproject.toml`, CI). Antes, "testes automatizados"
    era uma linha genérica em "Technical constraints from rules" — nada obrigava a olhar a regra.
  - **E2 — matriz de cenários**, com dois caminhos explícitos. *Caminho 1* (task com
    `acceptanceScenarios[]`/`businessRules[].testScenarios[]`/`errorHandling{}`/`testingStrategy{}`/
    `uiContext`/`apiContracts[]`) e *Caminho 2* (**planejar** os cenários quando a task não os traz).
    O Caminho 2 é a resposta direta ao caso "task antiga / work item de Mode A sem `tasks.json`":
    a ausência de cenário estruturado deixa de ser desculpa e passa a ser trabalho de planejamento
    com piso mínimo de seis categorias.
  - **E3 — camada + `arquivo::nome do teste` por linha, antes do código.** É o que dá ao blueprint
    poder de guiar a implementação: quando o nome do arquivo de teste já existe no plano, escrever o
    teste deixa de ser uma decisão nova no fim do trabalho. Inclui a regra da **camada mais barata
    que ainda prova o cenário** (regra de domínio em unit de domínio, contrato de erro HTTP no slice
    de integração) — evita a inflação de E2E.
  - **E4 — congelamento e report do blueprint.**
- **Gate `TEST_BLUEPRINT_BEFORE_CODE` (FATAL).** Editar produção antes do blueprint é defeito de
  execução. Sem severidade FATAL o gate seria apenas mais um parágrafo — e a v1.3 já provou que
  parágrafo não segura ordem de execução.
- **Gate `TEST_LAYERS_FROM_RULES` (FATAL).** Toda camada que as rules exigem para o código tocado
  tem teste criado **ou** linha de dispensa com motivo. Fecha o buraco simétrico ao de cenário: não
  adianta cobrir todos os cenários só em unit quando a regra do projeto manda haver teste de
  integração com Testcontainers.
- **Dispensa nunca é omissão.** Camada dispensada e categoria não aplicável continuam existindo
  como **linha** na matriz, com motivo. A diferença entre "não se aplica" e "esqueci" é exatamente
  o que se perde no silêncio — mesma lógica de `SCENARIO_CATEGORY_SKIPPED`, agora estendida às
  camadas.
- **Testabilidade virou requisito de desenho.** Se uma linha do blueprint não é testável no desenho
  escolhido, o desenho se ajusta (extrair porta, injetar dependência, isolar domínio) em vez de a
  linha ser rebaixada para "não coberto" (`TESTABILITY_REFACTOR`, WARNING). Rebaixar a prova para
  caber no código é como a cobertura evapora sem ninguém decidir que ela evaporaria.
- **RED→GREEN recomendado, não obrigatório — exceto em Bug** (decisão do usuário, com uma exceção
  de coerência). Como regra geral fica **recomendado** nas linhas de alto risco (violação de regra de
  negócio, autorização) onde o runner já existe: o usuário optou por "planejar primeiro, implementar,
  depois escrever", e o rigor está no blueprint, não na ordem de digitação. **A exceção é o work item
  do tipo `Bug`:** ali RED→GREEN é obrigatório, porque a `spec-debug-fix` já o exige
  (`FIX_HAS_RED_GREEN`, linha 384 daquela skill) e a tabela "User Story vs Task" desta skill aceita
  Bug diretamente — sem a exceção, corrigir o mesmo defeito teria rigor diferente conforme a porta de
  entrada, e o caminho mais frouxo seria o mais fácil de escolher.
- **Persistência sem artefato novo** (decisão do usuário): a matriz condensada vai para o
  `spec_story.md` (bloco **Testes** por entrada) e para o comentário do work item no Azure DevOps.
  Nenhum arquivo novo em `outputs/spec/` — retrocompatibilidade máxima e nada a limpar.
- **`spec_story.md` ganha a seção "Estratégia de testes do módulo"** — runner, comandos,
  localização, fixtures/factories reutilizáveis, Testcontainers já configurado. Sem ela, cada task
  redescobria o stack do zero em E1, e a memória de módulo cobria só o *o quê*, nunca o *como
  provar*. **Arquivos existentes não precisam de migração:** as seções nascem na próxima escrita.
- **WARNINGs novos:** `NO_TEST_STACK_DECLARED`, `TEST_STACK_MISSING`, `COVERAGE_BELOW_THRESHOLD`,
  `E2E_SCENARIO_DEFERRED`, `LOAD_SCENARIO_DEFERRED`, `SCENARIO_ADDED_DURING_IMPLEMENTATION`,
  `TESTABILITY_REFACTOR`. Todos são *reportar e seguir* — nenhum bloqueia. A regra por trás: uma
  ausência **conhecida e escrita** é gerenciável; o que quebra a cadeia é a ausência invisível.
- **Nada de instalar stack por conta própria.** Rule declara ferramenta que o repositório não tem →
  usa o que existe e reporta (`TEST_STACK_MISSING`). Projeto sem regra **e** sem nenhum teste →
  **para e pergunta**; em execução desassistida, entrega a matriz como checklist manual. Escolher
  framework de teste é decisão de projeto (`spec-tech-rules`), não de task.
- **`EXTERNAL_SERVICE_FAILURE` é categoria desta skill, não da Fase 7.** A `spec-tasks` emite cinco
  categorias em `acceptanceScenarios[].category` (`HAPPY_PATH`, `INVALID_INPUT`,
  `BUSINESS_RULE_VIOLATION`, `AUTHORIZATION`, `EDGE_CASE`). A sexta — falha de serviço externo — é
  **planejada aqui** quando a task chama serviço externo ou fila, e por isso sai sempre com origem
  `derived`, mesmo em task estruturada. A v1.3 já a listava sem essa ressalva, o que fazia o agente
  procurar na task um campo que a Fase 7 nunca produziu. *(Candidato a issue na `spec-tasks`: incluir
  a categoria na matriz mínima.)*
- **Vocabulário fechado da coluna `Fonte`** (`AS-`, `RN-`, `EH-`, `UI-`, `API-`, `AC-`, `TC-`,
  `derived`, `descoberto`). Sem ele, "Fonte" recebia quatro tipos de valor incompatíveis e o
  agregado `structured|derived|mista` do relatório não fechava com as linhas.
- **`acceptanceCriteria` volta a ter destino garantido.** A v1.3 mapeava "cada bullet de AC → uma
  verificação" no checklist pós-código; ao mover a matriz para antes do código, esse mapeamento
  quase se perdeu — o Caminho 1 se apoiava só em `acceptanceScenarios[]`. Agora um AC sem cenário
  correspondente vira linha própria (`Fonte: AC-<n>`). É o que sustenta a task `class=security`,
  cuja âncora declarada pela Fase 7 é `implementationGuidance.security{}` + `acceptanceCriteria`,
  e não `acceptanceScenarios[]`.
- **`uiContext.fields[]` entra como fonte de `INVALID_INPUT`.** A Fase 7 já exige o inventário de
  campos (`TASK_UI_HAS_FIELD_CONTRACT`, FATAL) com tipo, obrigatoriedade e `options[]` — é a fonte
  mais barata e mais rica de cenário de entrada inválida, e a v1.3 usava do `uiContext` apenas
  `estadosUI[]` e `regras[]`.
- **A `spec-code-audit` ainda não lê a matriz.** O texto da v2.0 foi calibrado para não prometer
  mais do que existe: a matriz fica no `spec_story.md`, que a audit lê no Passo A.9 — mas o
  checklist de A.9 daquela skill pergunta sobre decisões arquiteturais e pendências, não sobre
  cobertura, e o Passo G redescobre os testes do zero. **Issue aberta na `spec-code-audit`:**
  acrescentar ao A.9 a leitura do bloco **Testes** e citá-lo como comparação em G.2/G.3. Enquanto
  isso não acontece, o bloco é escrito e lido por humanos e pela própria `spec-implement` na task
  seguinte — o que já justifica mantê-lo.
- **Classes de task explicitadas** (`functional`, `security`, `uat`, `spike`) — a v1.3 não dizia o
  que fazer ao receber uma task `uat` (roteiro humano) ou `spike`. Agora diz, e alinha com as
  classes que a `spec-tasks` emite.
- **Gate `IMPL_COVERAGE` no sync-log** — os números da cobertura entram na coluna de questões em
  aberto, no mesmo espírito de `TESTPLAN_COVERAGE` (`spec-test-plan`) e `SCENARIOS_FROM`
  (`spec-tasks`).
- **Retrocompatibilidade.** Bloco de invocação, Mode A/Mode B, fronteiras de pasta, cross-check
  opcional de `data-model.json`/`api-contracts.yaml`, propriedade e operações on-demand do
  `spec_story.md`, regra de transição de estado e **todos os 11 códigos de validator da v1.3**
  seguem idênticos. `tasks.json` antigos (sem `acceptanceScenarios[]`) e projetos sem regra de
  testes **não bloqueiam** — caem em caminho alternativo com WARNING. Os dois FATAIS novos são
  intencionalmente incompatíveis com uma execução que code antes de planejar: é o defeito que a
  versão existe para reprovar.

### 1.3 — 2026-07-08

- Matriz de cenários introduzida na seção de validações, com categorias vindas de
  `acceptanceScenarios[].category` e derivação a partir de prosa quando ausentes.
- Gates `ALL_SCENARIOS_TESTED` e `NEGATIVE_PATHS_COVERED` (FATAL); `SCENARIOS_DERIVED_FROM_TEXT` e
  `SCENARIO_CATEGORY_SKIPPED` (WARNING).
- `uiContext.estadosUI[]` como cenários obrigatórios em task de UI.
- `data-model.json`/`api-contracts.yaml` rebaixados a cross-check opcional; work item vence em
  conflito (`CROSS_CHECK_DIVERGENCE`).

### 1.2

- **Mode B — `tasks.json` local**, para rodar sem Azure DevOps MCP.
- Propriedade integral do `spec_story.md`: leitura no início, escrita no fim, e as operações
  on-demand (`view`, `init`, `add-entry`, `add-pattern`, `edit-entry`).
- Resolução de rules multi-ambiente (Cursor / Claude Code / Cowork).
