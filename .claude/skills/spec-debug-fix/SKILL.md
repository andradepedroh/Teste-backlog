---
name: spec-debug-fix
description: >
  spec-debug-fix (Fase 11c — Debug Baseado em Evidência & Correção) — invocar quando houver
  retorno de teste ou bug reportado em uma task: lê a task e a documentação, mapeia o fluxo
  ponta a ponta, faz TRIAGEM de dado/configuração antes de instrumentar (registro ausente no
  banco, parametrização, flag, permissão — se não for bug de código, encerra com SAÍDA
  RÁPIDA: resposta objetiva, sem fix), instrumenta com logs/traces correlacionados, sobe o
  ambiente, reproduz, prova a causa-raiz por evidência (EVID-NN, nunca suposição), corrige
  com teste de regressão RED→GREEN, verifica end-to-end e faz análise de regressão antes de
  fechar. Classifica falhas: (a) código, (b) dado/carga, (c) ambiente, (d) conforme spec.
  Agnóstica de stack e tracker (ADO MCP, tasks.json ou texto). Produz debug-report.md e
  rascunho de comentário (publica só com aprovação). Triggers: "debugar/corrigir a task",
  "retorno de teste", "bug não reproduz", "adiciona logs e descobre por que falha",
  "causa-raiz", "spec-debug-fix". Conteúdo em PT-BR.
version: "1.2"
updated: "2026-08-24"
---

# spec-debug-fix — Debug Baseado em Evidência & Correção

> **Skill agnóstica de projeto, linguagem, framework e tracker.** Não contém referências a
> projetos específicos. Todos os exemplos usam placeholders (`TASK-001`, `MOD-XXX`, `EVID-01`).
> A skill **descobre** stack, build e convenções lendo o próprio projeto (rules, README,
> build files) — nunca assume.

## Papel

Esta é a **Fase 11c** da cadeia técnica (evento, não etapa — como `spec-scope-change`).
Roda quando uma task já implementada (Fase 11 — `spec-implement`) volta com **retorno de
teste**: QA reprovou, comportamento divergente em homologação, bug reportado em produção,
ou "não reproduz". O ciclo é: **entender → mapear → instrumentar → reproduzir → provar →
corrigir → verificar → proteger contra regressão → reportar**.

**Posição no pipeline:** entre `spec-implement` (Fase 11) e `spec-code-audit` (Fase 12),
podendo ser invocada a qualquer momento pós-implementação.

**Out of scope:** implementar funcionalidade nova (use `spec-implement`); auditoria ampla de
qualidade/segurança (use `spec-code-audit`); redefinir requisito quando a classe da falha é
(d) works-as-designed com spec errada (devolver ao fluxo de produto / `spec-scope-change`).

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

Vale para o `debug-report.md` e para a devolutiva no chat. Em especial: hipótese, evidência e causa raiz em português, dizendo **o que o usuário via de errado** antes de dizer qual linha estava errada. Quem lê o relatório de bug muitas vezes não é quem escreveu o código.

## Princípio Central

> **Evidência, não suposição.** Nenhuma causa-raiz é afirmada sem um trecho de log, trace,
> diff de estado ou teste que a **prove**. "Provavelmente", "deve ser", "parece que" são
> proibidos no relatório final — cada afirmação causal cita um `EVID-NN`. Se a evidência
> ainda não existe, a próxima ação é **instrumentar para obtê-la**, não opinar.

---

## Princípios inegociáveis (valem em todas as fases)

1. **Evidência, não suposição** — ver Princípio Central.
2. **Toda falha é classificada** em uma de quatro classes antes de qualquer correção:

   | Classe | Descrição | Ação da skill |
   |--------|-----------|---------------|
   | **(a) CÓDIGO** | Defeito em lógica, contrato, serialização, config versionada | **Corrigir** (Fases 7–9) |
   | **(b) DADO/CARGA** | Massa de teste ausente, cadastro faltante, carga não executada | **Reportar** como dependência externa; mostrar por log que o código faz a parte dele |
   | **(c) AMBIENTE** | Credencial, período fechado, rede, serviço externo indisponível, versão de infra | **Reportar** como dependência externa com evidência do limite |
   | **(d) CONFORME SPEC** | O código faz exatamente o que a especificação manda; o teste esperava outra coisa | **Devolutiva** ao relator citando a spec (RF/RN/critério de aceite) — não "corrigir" sem mudança formal de escopo |

3. **Rules e convenções do projeto primeiro** — ler ANTES de editar (resolução multi-ambiente
   abaixo). Idioma de identificadores, camadas, política de build e de log: o que a rule
   mandar, vale.
4. **Build e validação pela via oficial** do projeto (ex.: Docker-first se a rule mandar;
   toolchain/versões pinadas do repo — nunca a versão global da máquina).
5. **Não quebrar outros cenários** — toda mudança passa por análise de impacto + testes de
   áreas afetadas e adjacentes (Etapa J, obrigatória).
6. **Segurança do diagnóstico** — nunca logar segredos/PII em claro (tokens, senhas, CPF/CNPJ,
   cartão, e-mail completo); mascarar quando o dado precisar transitar em log de diagnóstico
   (`ma**@dominio.com`, `***.456.789-**`). Alinhado à rule de segurança do projeto (PII em logs).
7. **Ações externas/irreversíveis só com confirmação explícita** — comentar/mover work item,
   commit, push, PR, deletar dados. Trabalhar em branch local; **nunca** commitar sem pedido.
8. **Instrumentação é temporária e rastreada** — todo log de diagnóstico entra no
   **manifest de instrumentação** com marcador greppável, e a Etapa K decide o destino de cada
   um (remover / rebaixar nível / promover a log permanente).
9. **Timebox de diagnóstico** — após **3 ciclos** de instrumentar→reproduzir→ler sem provar a
   causa-raiz, **parar**, consolidar o que foi eliminado (hipóteses refutadas com evidência) e
   reportar ao usuário com as opções de próximo passo. Não iterar indefinidamente.

---

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver `../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-debug-fix | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.

---

## Quick start (ordem de execução)

```
Kickoff  — coletar entradas; pedir o que faltar (não inventar)
Etapa A  — Ingestão da task (ADO MCP, tasks.json ou texto colado)
Etapa B  — Contexto: rules + docs + mapa do fluxo ponta a ponta (sub-agentes se multi-repo)
Etapa C  — Baseline do código (branch, working tree, handoff validado por grep/leitura)
Etapa D  — TRIAGEM de dado/configuração (barata, antes de instrumentar)
           └─ se provar classe (b)/(c)/(d) → SAÍDA RÁPIDA: resposta objetiva + Etapa K-light. FIM.
Etapa E  — Instrumentação: logs parametrizados + correlação + manifest + build verde
Etapa F  — Subir ambiente pela via oficial + reproduzir cenários com payloads reais
Etapa G  — Ler logs como debugger: hypothesis ledger → causa-raiz PROVADA + classificada
Etapa H  — Correção mínima e coesa + teste de regressão RED→GREEN (classe (a))
Etapa I  — Verificação end-to-end: evidência de log antes/depois
Etapa J  — Análise de regressão: impacto por mudança + suítes afetadas e adjacentes verdes
Etapa K  — Fechamento: debug-report.md, higiene da instrumentação, spec_story.md,
           rascunho do comentário (publicar SÓ com aprovação)
```

Ao concluir cada etapa, registrar explicitamente o **critério de saída atingido**.

---

## Kickoff (K) — Entradas normativas

Pedir **uma vez** tudo o que faltar. **Nunca inventar** identificadores, caminhos ou credenciais.

| Entrada | Obrigatória | Descrição |
|---------|-------------|-----------|
| **Task/bug id(s) + fonte** | Sim | Work item do Azure DevOps (via MCP), entrada em `tasks.json`, issue de outro tracker, ou o texto do retorno colado no chat. |
| **Repositório(s) e pastas autorizadas** | Sim | Raízes onde ler/instrumentar/editar. Fora delas, **não** modificar nada sem expansão explícita de escopo. |
| **Documentação de contexto** | Sim | Onde está a spec do módulo (`outputs/spec/`, wiki, anexos do work item). Se não houver, registrar `WARNING: NO_SPEC_CONTEXT`. |
| **Como o ambiente sobe** | Descobrir + confirmar | A skill **descobre** (compose, scripts, Makefile, README, rules de build) e **confirma** com o usuário credenciais/segredos/particularidades. Nunca pedir que o usuário digite segredos no chat — apontar para `.env`/secret manager. |

**Opcionais:** branch alvo; estado/coluna do tracker para handoff; payloads adicionais do QA;
acesso a logs de ambiente remoto (APM, agregador).

> **Cowork:** se a pasta de código não estiver conectada à sessão, parar e pedir para conectar.
> **MCP indisponível:** não fingir que a task foi lida — cair para tasks.json/texto colado ou parar.

### Resolução de rules (multi-ambiente)

Seguir `../tools/references/task-pipeline.md` §3: `.cursor/rules/` → `.claude/rules/` →
perguntar. Ler **todos** os arquivos normativos (sem cherry-picking); rules do projeto
prevalecem. Aplicar sempre a rule de segurança.

### Memória do módulo

Se existir `spec_story.md` na raiz de cada pasta de código, **ler em full** antes de tudo:
padrões estabelecidos e histórico dizem o que já foi implementado/decidido — inclusive se o
sintoma reportado já foi tocado por task anterior.

---

## Etapa A — Ingestão da task

**Objetivo:** entender o que o relator viu, o que esperava, e com quais dados.

**Ações:**

1. Buscar o(s) work item(s) — **Modo A (ADO/MCP):** descrição, critérios de aceite,
   **comentários** (o retorno de teste costuma estar neles), anexos (prints, payloads),
   links (task pai, duplicadas, PRs). **Modo B (tasks.json):** localizar a task em
   `stories[].tasks[]`. **Modo C (texto colado):** tratar o texto como fonte, registrando
   que não há tracker acoplado.
2. Extrair e tabular: **cenário de negócio**, **payload(s) de exemplo** (literais, sem
   normalizar), **comportamento esperado**, **comportamento observado**, **ambiente do
   relato** (URL, data/hora, usuário/tenant de teste), e qualquer **handoff** citando
   arquivos/métodos/branches.
3. Se a task tem N sintomas distintos, **separar por sintoma** (`S-01`, `S-02`, …) — cada
   sintoma percorre o ciclo com sua própria classificação e evidência; não tratar como um
   bug único.
4. Se faltar dado essencial (payload, passo de reprodução, ambiente), **perguntar antes** de
   prosseguir — pedir ao relator o mínimo reproduzível.

**Critério de saída:** resumo do retorno + critérios de aceite + lista de cenários a
reproduzir, cada um com payload e resultado esperado.

---

## Etapa B — Contexto e arquitetura

**Objetivo:** saber por onde a requisição passa antes de olhar qualquer linha de log.

**Ações:**

1. Ler a documentação do módulo (spec/discovery/requirements/business-rules quando existirem
   em `outputs/spec/`) e **todas** as rules do repo.
2. Mapear o **pipeline ponta a ponta** da funcionalidade, em todas as camadas e todos os
   repositórios: contrato/API de entrada → validação → orquestração/serviço → clientes de
   integração → motor/serviço legado → persistência → efeitos assíncronos (fila, job, evento).
3. Em repos grandes ou multi-repo, despachar **sub-agentes de exploração em paralelo** (um por
   repo/camada) que retornam apenas o trecho do mapa — o orquestrador consolida.
4. Registrar o mapa como tabela: `# | Etapa | Repo | Arquivo:linha | Método/função | O que decide`.

**Critério de saída:** **mapa do fluxo** com arquivo:linha de cada etapa, salvo em
`outputs/spec/debug/<TASK-ID>/flow-map.md`.

---

## Etapa C — Verificação do estado do código

**Objetivo:** baseline confiável — o handoff pode estar errado.

**Ações:**

1. Confirmar branch e working tree (`git status`, `git log -n 5`) em **cada** repo; anotar o
   commit exato do baseline.
2. **Validar o handoff com grep/leitura** — não confiar: a branch citada existe? O campo/método
   que a task diz ter sido implementado está lá? A versão em execução no ambiente do relato
   corresponde a este código (tag/commit do deploy, quando descobrível)?
3. Quando o sintoma é "funcionava antes": identificar candidato a commit ofensor por
   `git log`/`git blame` no trecho do mapa; se houver build reproduzível barato, considerar
   **bisect/comparação diferencial** entre versão boa e versão má como atalho de diagnóstico.
4. Reportar **divergências** encontradas (branch inexistente, campo não implementado, deploy
   defasado) **antes** de prosseguir — uma divergência aqui pode reclassificar a falha como
   (c) ambiente sem precisar de instrumentação.

**Critério de saída:** baseline registrado (repo × branch × commit) + lista do que está e do
que **não** está no código versus o que a task afirma.

---

## Etapa D — Triagem de dado e configuração (obrigatória, ANTES de instrumentar)

**Objetivo:** eliminar as causas baratas primeiro. Grande parte dos "retornos de teste" não é
bug de código — é registro ausente no banco, parametrização não feita, flag desligada,
permissão faltando. Instrumentar o pipeline inteiro para descobrir isso é desperdício.

**Ações — verificar, com evidência, na ordem de custo:**

1. **Dado existe?** O(s) registro(s) que o cenário pressupõe estão no banco/serviço do
   ambiente de teste? (cadastro, vínculo, saldo, item de tabela de domínio, massa de carga).
   Evidência: resultado literal da query/consulta (mascarando PII).
2. **Configuração existe?** Parametrização, tabela de configuração, feature flag, template,
   variável de ambiente, propriedade — presente e com o valor que o fluxo exige? Evidência:
   dump do valor (mascarando segredos).
3. **Permissão/credencial existe?** Usuário de teste tem o perfil/escopo/rota liberada?
   Credencial de integração válida e não expirada?
4. **Período/janela válido?** Data de vigência, competência aberta, cut-off, calendário.
5. **Spec confere?** Reler RF/RN/critério de aceite: o comportamento reportado como errado é
   exatamente o que a spec manda? (candidato a classe (d)).

**Regra de decisão:**

- **Causa provada aqui** (ex.: `SELECT` retorna vazio para a chave do payload; flag `X`
  desligada no ambiente) → classificar (b)/(c)/(d), registrar `EVID-NN` e ir **direto para a
  Saída rápida** abaixo. Não instrumentar, não corrigir.
- **Suspeita sem prova, ou tudo presente** → seguir para a Etapa E (instrumentação). A triagem
  negativa também é evidência: entra no ledger como hipóteses refutadas.
- **Ambíguo** (dado existe mas parece malformado; config existe mas semanticamente estranha) →
  seguir o ciclo completo; a triagem vira hipótese ABERTA no ledger.

> **Cuidado:** "faltou registro" pode ser sintoma, não causa — se o código é que **deveria ter
> criado** o registro e não criou, a classe é (a), não (b). A triagem só encerra quando a
> ausência é responsabilidade de terceiros (carga, cadastro manual, provisionamento), o que
> deve estar explícito na justificativa.

**Critério de saída:** checklist 1–5 respondido com evidência; decisão registrada (saída
rápida ou ciclo completo).

---

## Saída rápida (quando não é bug de código)

Quando a Etapa D (ou qualquer fase posterior) **prova** classe (b)/(c)/(d), o entregável é
**uma resposta, não um fix**:

1. **Resposta objetiva no chat** (formato devolutiva): o que foi verificado, a evidência
   (`EVID-NN`), a classe, **o que precisa ser feito e por quem** (ex.: "cadastrar o registro X
   na tabela Y do ambiente de homologação — responsabilidade da equipe de dados"), e como
   revalidar depois.
2. **Rascunho de comentário para o work item** com o mesmo conteúdo (publicar só com aprovação).
3. **Etapa K-light:** linha no sync-log + entrada curta no `spec_story.md` **somente se** houver
   aprendizado de padrão (ex.: "ambiente de QA não recebe carga da tabela Z"); sem
   debug-report completo, sem manifest (nada foi instrumentado), sem análise de regressão
   (nada mudou no código).
4. Se durante a triagem foi criado algo temporário (registro de teste, flag alterada),
   **reverter ou declarar** explicitamente.

A exigência de evidência **não** relaxa na saída rápida: `ROOT_CAUSE_EVIDENCED` e
`FAILURE_CLASSIFIED` valem igual. O que muda é o tamanho do entregável.

---

## Etapa E — Instrumentação (logs + traces)

**Objetivo:** olhos em cada etapa do mapa antes de reproduzir.

**Ações:**

1. Adicionar logs de diagnóstico **parametrizados** em cada etapa do `flow-map.md`, em todas
   as camadas/repos, usando o **framework de log de cada repo** (não misturar; não introduzir
   lib nova para isso).
2. Cobrir: entrada crua do request; resultado de **cada** validação/decisão (com os valores
   comparados); valores derivados/calculados; request/response de chamadas entre serviços;
   branches relevantes; pontos de falha conhecidos; e o **estado persistido** antes/depois
   quando o sintoma envolve dado gravado.
3. **Correlação:** propagar `traceId`/correlation-id/MDC entre serviços para cruzar logs;
   usar/estender OTEL/tracing se o projeto já tiver.
4. **Marcador greppável:** toda linha de diagnóstico carrega o prefixo `[DBG:<TASK-ID>]` na
   mensagem e comentário `// DEBUG-FIX(<TASK-ID>)` (sintaxe do repo) na linha do código —
   é o que torna a limpeza da Etapa K verificável por grep.
5. **Manifest de instrumentação:** registrar cada ponto em
   `outputs/spec/debug/<TASK-ID>/instrumentation.md`:
   `| # | Repo | Arquivo:linha | Nível | O que loga | Mascaramento | Destino (remover/rebaixar/promover) |`.
6. **Níveis:** default seguro (DEBUG/TRACE desligado por padrão) + variável de ambiente para
   elevar na sessão — nunca inundar um ambiente compartilhado. **Nunca** logar segredo/PII em
   claro (princípio 6).

**Critério de saída:** build **verde pela via oficial** em todos os repos instrumentados +
manifest cobrindo 100% das etapas do mapa.

---

## Etapa F — Ambiente e execução (reprodução)

**Objetivo:** o cenário do retorno rodando sob os olhos da instrumentação.

**Ações:**

1. Subir infraestrutura e serviços **pela via oficial** (compose/scripts/rules); resolver
   portas, variáveis e dependências; **aguardar readiness** (healthcheck ou log de startup) —
   não disparar cenário contra serviço subindo.
2. **Paridade de ambiente:** comparar o que der com o ambiente do relato (versões, feature
   flags, configuração, massa) e anotar toda diferença — cada diferença é uma hipótese de
   classe (c) em potencial.
3. **Reproduzir** os cenários da Etapa A com os **payloads reais**. Atenção a idempotência e
   chaves de negócio: usar identificadores **novos** quando o fluxo dedupe/rejeita repetidos,
   para forçar registros frescos.
4. Capturar resposta literal (status, corpo, headers relevantes) de cada execução.
5. **Se NÃO reproduzir:** não encerrar como "não reproduz" sem antes (i) validar paridade do
   passo 2, (ii) reexecutar com os dados exatos do relato, (iii) tentar variações plausíveis
   (timezone, encoding, concorrência, ordem). Persistindo, executar o cenário **N vezes**
   (≥5) para caçar intermitência; se ainda assim nada, reportar **não-repro documentado**:
   evidência de que o fluxo passou verde + diferenças de ambiente encontradas + pedido
   objetivo de mais dados ao relator. Nunca "confirmar" um bug não observado.

**Critério de saída:** cenários executados com respostas capturadas (reprodução confirmada,
intermitência caracterizada, ou não-repro documentado com evidência).

---

## Etapa G — Coleta e leitura dos logs (o "debug")

**Objetivo:** causa-raiz provada, não narrada.

**Ações:**

1. Cruzar os logs de todos os serviços pelo `traceId`; **reconstruir a jornada** da requisição
   na ordem real dos eventos.
2. Manter um **hypothesis ledger** — método científico explícito:

   | H-ID | Hipótese | Previsão observável (se verdadeira, o log mostrará…) | Evidência (EVID-NN) | Status |
   |------|----------|------------------------------------------------------|---------------------|--------|
   | H-01 | … | … | EVID-03 | CONFIRMADA / REFUTADA / ABERTA |

   Uma hipótese só muda de status por **evidência citada** — nunca por plausibilidade.
3. Registrar cada evidência com identidade e literal:

   ```
   EVID-NN — <serviço/repo> · <origem (arquivo de log/stdout/tabela)> · <timestamp> · traceId=<id>
   > trecho LITERAL do log (sem parafrasear)
   Interpretação: <uma frase>
   ```

4. Localizar **onde** e **por quê** o fluxo divergiu do esperado; **classificar** a falha
   (a/b/c/d) com justificativa apontando EVID-NN.
5. Se um trecho ficou **cego** (o log salta da etapa 4 para a 7), voltar à Etapa E para
   instrumentar o intervalo — isso consome um dos 3 ciclos do timebox (princípio 9).
6. Quando útil, **reduzir o payload ao mínimo reproduzível** — cada campo removido que mantém
   a falha estreita a causa; o payload mínimo entra como evidência.

**Critério de saída:** causa-raiz **provada** por EVID-NN citados + classe (a/b/c/d) declarada
+ ledger sem hipótese ABERTA relevante (ou timebox atingido e reportado).

---

## Etapa H — Correção

*Somente para classe (a). Classes (b)/(c)/(d) seguem a **Saída rápida** (resposta objetiva);
se a classe (b)/(c) só foi provada após instrumentar, verificar na Etapa I que o código faz a
parte dele até a fronteira e então encerrar pela Saída rápida.*

**Objetivo:** mudança mínima e coesa que ataca a causa-raiz.

**Ações:**

1. Implementar o fix nas camadas necessárias, fiel à especificação da task e às rules de cada
   repo (idioma, camadas, padrões do `spec_story.md`).
2. **Teste de regressão RED→GREEN obrigatório:** antes do fix, escrever o teste automatizado
   que reproduz o bug (deve **falhar** no baseline — RED); depois do fix, deve **passar**
   (GREEN). Esse teste é **permanente** — entra na suíte com nome rastreável à task
   (ex.: `regression_TASK-001_<sintoma>`), garantindo que o bug não volte em silêncio. Se o
   bug for genuinamente intestável em unit/integration (ex.: só reproduz com serviço externo),
   registrar a exceção justificada no relatório (`WARNING: NO_AUTOMATED_REPRO`).
3. **Preservar compatibilidade:** evoluir contratos sem quebrar chamadas/serialização
   existentes (campos novos opcionais, overloads/construtores de compatibilidade, defaults);
   atenção a chaves de idempotência, digests e formatos persistidos — mudá-los é regressão
   clássica.
4. **Sem scope creep:** não refatorar módulos não relacionados nem "aproveitar para melhorar".

**Critério de saída:** diff mínimo e coeso + teste RED→GREEN evidenciado (saída do runner nos
dois estados).

---

## Etapa I — Verificação end-to-end

**Objetivo:** provar por log que o comportamento mudou — não que "compila".

**Ações:**

1. Rebuild pela via oficial e **re-executar os MESMOS cenários** da Etapa F (mesmos payloads;
   identificadores novos se idempotência exigir).
2. Confirmar **por log** (EVID-NN novos) que o ponto que falhava agora se comporta como
   esperado — o campo propaga, o valor resolve, a validação aceita/rejeita corretamente.
3. Montar o **antes/depois**: EVID da falha (Etapa G) lado a lado com EVID da correção.
4. **Honestidade sobre limites:** se o efeito final depende de dado/carga/credencial ausente
   (classe (b)/(c) residual), mostrar por log que o código executa a sua parte até a fronteira
   e listar a dependência externa — sem prometer o que não foi observado.

**Critério de saída:** evidência de log antes/depois para cada sintoma tratado.

---

## Etapa J — Análise de regressão (obrigatória antes de fechar)

**Objetivo:** garantir que a correção não quebrou o resto.

**Ações:**

1. Para **cada** mudança do diff, análise de impacto: quem mais usa este símbolo/arquivo/rota
   (grep/find-references)? Há colisão (constante/placeholder/config compartilhada com outros
   fluxos)? Mudou serialização, contrato público, chave de idempotência, tratamento de erro,
   comportamento de retry?
2. Tabular: `| Mudança | Usado também por | Risco | Verificação feita |`.
3. Rodar os testes das áreas **afetadas e adjacentes** (não só o fluxo corrigido), pela
   **mesma toolchain** do projeto (atenção a versões de runtime/JDK/node pinadas).
4. **Caçar regressões introduzidas pela própria correção** (validação estrita demais, digest
   alterado, campo obrigatório novo quebrando produtor antigo) e corrigi-las; iterar até tudo
   verde.
5. Riscos que não dá para cobrir por teste automatizado entram como **risco residual**
   explícito no relatório.

**Critério de saída:** suíte relevante verde + tabela de impacto preenchida + riscos residuais
declarados.

---

## Etapa K — Fechamento

**Objetivo:** relatório auditável + higiene + memória; nada publicado sem aprovação.

**Ações:**

1. Gerar `outputs/spec/debug/<TASK-ID>/debug-report.md` (template em
   `templates/debug-report.template.md`) com: causa-raiz com EVID-NN; classe da falha; o que
   foi feito em cada repo/camada; antes/depois; teste de regressão; tabela de impacto;
   **dependências externas pendentes** (classes b/c); riscos residuais; e a **nota de validação
   de regressão**.
2. **Higiene da instrumentação:** percorrer o manifest e executar o destino de cada linha —
   remover, rebaixar nível, ou promover a log permanente (aí sim sem marcador `[DBG:]` e com
   mascaramento definitivo). Validar com `grep DEBUG-FIX(<TASK-ID>)` que nada esquecido
   sobrou fora do decidido; itens retidos de propósito ficam listados como higiene pré-merge.
3. **Rascunho do comentário do work item** (seção própria do report): resumo executivo para o
   QA/relator — o que era, o que foi feito, como validar, o que ainda depende de terceiros.
   Em classe (d), a devolutiva cita RF/RN/critério que o comportamento atual cumpre.
4. **Publicação/commit/PR/estado do card: SÓ após confirmação explícita do usuário.**
   Apresentar o rascunho e perguntar. Em Modo B/C (sem tracker), o report em chat encerra.
5. Atualizar `spec_story.md` de cada pasta tocada (mesmo padrão que o `spec-implement` mantém): entrada nova com o
   bug, causa-raiz, fix, teste de regressão criado e o que ficou para depois. Se o diagnóstico
   revelou um **padrão recorrente** (ex.: "toda integração X exige identificador novo por
   idempotência"), registrar em Padrões estabelecidos.
6. Persistir em memória do agente aprendizados **não óbvios** de domínio/ambiente (como o
   ambiente sobe, pegadinhas de massa de teste) — nunca segredos/PII.
7. Sync-log: adicionar a linha de fechamento.

**Critério de saída:** debug-report.md completo + instrumentação higienizada verificada por
grep + spec_story atualizado + rascunho aguardando (ou com) aprovação.

---

## Casos especiais

| Caso | Conduta |
|------|---------|
| **Não é bug — dado/config ausente** | Conduta completa na § Saída rápida (Etapa D) |
| **Bug não reproduz** | Conduta completa na Etapa F §5; nunca inventar causa |
| **Intermitente/flaky** | Caracterizar taxa (X falhas em N execuções), suspeitar de concorrência/tempo/ordem; instrumentar timestamps de alta resolução e IDs de thread/worker; considerar execução concorrente forçada como reprodução. |
| **Works-as-designed (classe d)** | Não corrigir. Devolutiva com citação da spec. Se a spec é que está errada, encaminhar para `spec-scope-change`/fluxo de produto — mudança de comportamento sem mudança formal de escopo é proibida. |
| **Vários sintomas numa task** | Separar S-01..S-NN na Etapa A; ciclo e classificação por sintoma; um sintoma pode ser (a) e outro (c). |
| **Regressão de versão ("funcionava antes")** | Etapa C §3 — blame/bisect diferencial como atalho; a evidência é o commit ofensor + log confirmando o mecanismo. |
| **Causa em repo não autorizado** | Parar e pedir expansão de escopo — nunca editar fora das pastas autorizadas. |
| **Timebox atingido (3 ciclos)** | Consolidar hipóteses refutadas + trechos ainda cegos + opções (mais acesso, mais dados, par com dev do domínio) e devolver a decisão ao usuário. |

---

## Hard rules

As proibições estão codificadas nos **validators FATAL** abaixo — cada "nunca" tem o seu código
(`ROOT_CAUSE_EVIDENCED`, `REPRO_OR_DOCUMENTED`, `E2E_VERIFIED_BY_LOG`, `FIX_HAS_RED_GREEN`,
`NO_SECRETS_IN_LOGS`, `EXTERNAL_ACTION_CONFIRMED`, `REGRESSION_ANALYZED`,
`INSTRUMENTATION_TRACKED`). Única proibição sem validator: **nunca** "corrigir" comportamento
classe (d) sem mudança formal de escopo.

> **Por que `EXTERNAL_ACTION_CONFIRMED` aqui e não na `spec-implement`:** lá, o pedido de
> implementação já contém a autorização de atualizar o work item (é o entregável); aqui, o
> comentário/estado nasce de um **diagnóstico** — publicar sem confirmação seria decidir pelo
> usuário o destino do card.

---

## Validators (FATAL / WARNING)

### FATAL — bloqueia o fechamento

| Código | Verificação |
|--------|-------------|
| `TRIAGE_BEFORE_INSTRUMENTATION` | A triagem de dado/configuração (Etapa D) foi executada e registrada antes de qualquer instrumentação |
| `REPRO_OR_DOCUMENTED` | Cada sintoma foi reproduzido com evidência, OU o não-repro foi documentado (paridade + dados exatos + N execuções), OU a causa foi provada na triagem — antes de qualquer conclusão |
| `ROOT_CAUSE_EVIDENCED` | Causa-raiz cita EVID-NN com trecho literal de log/trace/teste; nenhuma afirmação causal sem evidência |
| `FAILURE_CLASSIFIED` | Toda falha classificada (a/b/c/d) com justificativa ancorada em evidência |
| `FIX_HAS_RED_GREEN` | Fix de classe (a) acompanhado de teste de regressão que falhava antes e passa depois (ou exceção justificada via `NO_AUTOMATED_REPRO`) |
| `E2E_VERIFIED_BY_LOG` | Comportamento pós-fix confirmado por evidência de log antes/depois — não apenas build/testes verdes |
| `REGRESSION_ANALYZED` | Tabela de impacto por mudança preenchida + testes de áreas afetadas e adjacentes verdes |
| `INSTRUMENTATION_TRACKED` | 100% dos logs de diagnóstico no manifest, com marcador greppável e destino executado/verificado |
| `NO_SECRETS_IN_LOGS` | Nenhum segredo/PII em claro em qualquer log adicionado |
| `EXTERNAL_ACTION_CONFIRMED` | Nenhum comentário/estado/commit/push/PR sem confirmação explícita do usuário |
| `SCOPE_RESPECTED` | Nenhum arquivo editado fora das pastas autorizadas |

### WARNING — não bloqueia; vai no relatório

| Código | Verificação |
|--------|-------------|
| `FAST_PATH_EXIT` | Encerrado pela Saída rápida (classe b/c/d provada) — entregável foi resposta/devolutiva, sem fix; evidência anexada |
| `ENV_DEPENDENCY_PENDING` | Classe (b)/(c) identificada — dependência externa listada com dono sugerido |
| `NO_AUTOMATED_REPRO` | Bug intestável em suíte automatizada — justificativa registrada, validação manual descrita |
| `INSTRUMENTATION_RETAINED` | Logs de diagnóstico mantidos de propósito (nível rebaixado/promovidos) — justificados como higiene pré-merge |
| `TIMEBOX_REACHED` | 3 ciclos sem causa-raiz — diagnóstico parcial consolidado e devolvido ao usuário |
| `FLAKY_SUSPECTED` | Intermitência caracterizada (taxa em N execuções) — risco residual declarado |
| `NO_SPEC_CONTEXT` | Sem documentação de spec disponível — diagnóstico baseado só em task + código |
| `ENV_PARITY_GAP` | Diferenças relevantes entre ambiente local e o do relato — listadas como limite da verificação |

---

## Artefatos de saída

| # | Artefato | Local |
|---|----------|-------|
| 1 | Mapa do fluxo (arquivo:linha por etapa) | `outputs/spec/debug/<TASK-ID>/flow-map.md` |
| 2 | Manifest de instrumentação (+ diff da instrumentação) | `outputs/spec/debug/<TASK-ID>/instrumentation.md` |
| 3 | Hypothesis ledger + evidências EVID-NN | dentro do `debug-report.md` |
| 4 | Diff da correção + teste RED→GREEN | repo (branch local) + citado no report |
| 5 | Evidência de log antes/depois | dentro do `debug-report.md` |
| 6 | Relatório de regressão (impacto, testes, riscos residuais) | dentro do `debug-report.md` |
| 7 | **debug-report.md** (consolidado, com rascunho do comentário) | `outputs/spec/debug/<TASK-ID>/debug-report.md` |
| 8 | Entrada no `spec_story.md` de cada pasta tocada | raiz da pasta de código |

> **Saída rápida:** os artefatos reduzem-se a resposta objetiva no chat + rascunho de
> comentário + linha no sync-log (e `spec_story.md` só se houver padrão aprendido).

Conteúdo humano em **Português do Brasil**.

---

## O que NÃO faz

- Não implementa funcionalidade nova nem work item sem retorno — use `spec-implement` (Fase 11).
- Não audita o código em largura (segurança/performance/cobertura geral) — use `spec-code-audit` (Fase 12).
- Não corrige "bugs" classe (d) sem mudança formal de escopo — use `spec-scope-change`.
- Não cria/carrega massa de dados de terceiros nem obtém credenciais — classes (b)/(c) são reportadas, não contornadas.
- Não publica comentário, move card, commita, pusha ou abre PR sem confirmação explícita.
- Não mantém instrumentação de diagnóstico sem registro e destino decidido.

---

## Relação com outras skills

| Skill | Quando |
|-------|--------|
| `spec-implement` | Implementou a task original e é o **dono do `spec_story.md`**; esta skill trata o retorno de teste, segue os padrões do `spec_story.md` e registra o fix nele com o mesmo formato. |
| `spec-code-audit` | Auditoria ampla pós-implementação; se o debug revelar problema sistêmico (ex.: erro silenciado em toda uma camada), recomendar auditoria. |
| `spec-scope-change` | Destino de bugs classe (d) quando a spec é que precisa mudar. |
| `spec-tasks` | Se o fix exigir trabalho novo relevante (além do bug), gerar task nova em vez de inflar o escopo do debug. |

---

## Invocação

**Cursor:** modo agente; referenciar `@.cursor/skills/spec-debug-fix/SKILL.md`.

**Claude Code / Cowork:** "use a skill spec-debug-fix" (ou `/spec-debug-fix`). Sem MCP do
tracker, apontar `tasks.json` + id, ou colar o retorno de teste no chat.

```markdown
@.cursor/skills/spec-debug-fix/SKILL.md

- Task/bug id: <id> (fonte: <ADO project | tasks.json path | texto abaixo>)
- Pastas de código autorizadas: <path/to/repo-1>, <path/to/repo-2>
- Documentação do módulo: <path/ou/wiki>
- Ambiente: <como sobe, se souber — senão a skill descobre e confirma>
```

Exemplos de linha do usuário:

```text
Retorno de teste na task 4312: o valor do desconto não aparece na nota. Adiciona logs,
descobre onde se perde e corrige sem quebrar os outros fluxos de emissão.
```

```text
Esse bug não reproduz aqui — investiga com os payloads do comentário do QA e me diz se é
código, massa ou ambiente.
```

---

## Limitações

- **Acesso ao ambiente do relato:** sem acesso a logs/config do ambiente onde o bug ocorreu, a
  verificação vale para o ambiente local — declarar via `ENV_PARITY_GAP`.
- **Serviços externos não simuláveis:** a verificação vai até a fronteira observável; o resto é
  dependência externa (classe (c)).
- **Multi-repo grande em uma sessão:** preferir um sintoma por sessão quando o contexto
  estourar; o `debug-report.md` parcial + `spec_story.md` preservam o estado entre sessões.
- **Nomes de tools MCP variam por cliente** — ler o descriptor antes de invocar.

---

*spec-debug-fix v1.1 — Fase 11c da cadeia técnica; debug baseado em evidência com triagem de dado/configuração antes de instrumentar, saída rápida quando não é bug de código, instrumentação rastreada, reprodução obrigatória, causa-raiz provada por EVID-NN, fix com regressão RED→GREEN e fechamento auditável.*
