---
name: spec-security-review
description: >
  spec-security-review (Fase 8b — Revisão de Segurança do Backlog) — invocar SEMPRE após spec-tasks
  para analisar vulnerabilidades nas tasks geradas. Lê tasks.json, as rules do projeto e o
  threat-model.md (quando disponível) para mapear cada story a vetores de ataque OWASP/STRIDE,
  identificar controles ausentes e INJETAR tasks SEC-NNN diretamente nas stories afetadas dentro
  do tasks.json. Neste harness a fonte primária dos SEC-### é o kernel
  outputs/spec/plano-de-seguranca.md (revisao-de-seguranca); a skill injeta primeiro os do kernel
  e deriva por conta própria só o que ele não cobre. Gaps cross-cutting geram uma nova story de
  segurança transversal. O tasks.json é modificado in-place e permanece a única fonte de verdade.
  Produz também security-review.md como relatório de auditoria. Pré-requisitos: tasks.json gerado
  por spec-tasks (Fase 8) e plano-de-seguranca.md (CADEIA-SEC-01).
  Triggers: "revisar segurança das tasks", "security review", "análise de vulnerabilidades no backlog",
  "spec-security-review", "SEC tasks", "injetar tasks de segurança".
version: "1.5"
updated: "2026-10-20"
---

# spec-security-review — Revisão de Segurança do Backlog

> **Posição no pipeline:** roda imediatamente após `spec-tasks` (Fase 8), antes de `spec-estimate`
> ou `spec-scaffold`. Modifica `tasks.json` in-place — o arquivo permanece a única fonte de verdade
> do backlog e pode ser publicado normalmente via `spec-tasks-azure` com as tasks de segurança incluídas.

---

## Papel

Ler o backlog estruturado (`tasks.json`) com olhos de atacante. Para cada story, mapear as
operações de negócio a vetores de risco (OWASP, STRIDE, CVSS) e verificar se os controles
corretos estão especificados. Gaps → tasks **SEC-NNN auto-suficientes injetadas diretamente
nas stories afetadas** dentro do `tasks.json`.

**Princípio central:** o agente implementador só lê `tasks.json`. Uma task de segurança que
não estiver dentro da story correspondente não existe para ele. Por isso, as tasks SEC-NNN
são injetadas na lista `tasks[]` da própria story — não em arquivo separado.

**A fonte primária é o kernel.** Os `SEC-###` do `plano-de-seguranca.md` entram primeiro
(Passo E.0-K); a análise por story dos Passos C e D deriva **só o que o kernel não cobre**, e o
que ela deriva volta para o kernel como Questão em aberto — nunca vira segunda lista.

**Dois tipos de output de tasks:**

| Tipo de gap | Destino no tasks.json |
|-------------|----------------------|
| Gap em story específica | Task SEC-NNN injetada em `story.tasks[]` |
| Gap cross-cutting (auth, RBAC, rate limit, logging…) | Tasks SEC-NNN em nova story `"Controles de Segurança Transversais"` na epic mais adequada |

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

Vale para cada achado. Ordem obrigatória: **o que um atacante consegue fazer**, em português e em uma frase, antes da sigla (OWASP, CWE, CVE) e antes do nome do controle. A sigla vai no fim, entre parênteses — regra 4.

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` (Seção A) — inclui a linha de kickoff (ver `../tools/references/task-pipeline.md` §4).
Ao terminar, adicionar UMA linha: `| # | data | spec-security-review | <resultado-resumo> | <artefatos> | <questões em aberto> | <próximo passo> |`.

---

## Pré-requisitos

| Artefato | Obrigatório | Localização default |
|----------|-------------|---------------------|
| `tasks.json` | Sim | `outputs/spec/tasks.json` |
| rules do projeto | Sim | `.cursor/rules/` → `.claude/rules/` (task-pipeline.md §3) |
| `plano-de-seguranca.md` | **Sim** — neste harness o `cadeia.mjs` (`CADEIA-SEC-01`) não deixa esta skill rodar sem ele | `outputs/spec/plano-de-seguranca.md` — kernel produzido pela `revisao-de-seguranca` (modo `plano-geral`) |
| `threat-model.md` | Recomendado | `outputs/spec/threat-model.md` |
| `data-model.json` | Opcional | `outputs/spec/data-model.json` |
| `api-contracts.yaml` | Opcional | `outputs/spec/api-contracts.yaml` |

**Saídas produzidas:**

| Artefato | O que é | Modificação |
|----------|---------|-------------|
| `tasks.json` | Backlog original + tasks SEC-NNN injetadas nas stories | **Modificado in-place** |
| `security-review.md` | Relatório de auditoria: findings, análise por story, cross-cutting | Criado |

---

## Ordem de Execução

```
K  → Kickoff (confirmar localizações e escopo)
A  → Carregar insumos
B  → Inventário de regras de segurança (rules do projeto)
C  → Mapa de operações × riscos (por story) + scoring dos gaps
D  → Análise cross-cutting
E  → Injetar tasks SEC-NNN nas stories (tasks.json modificado in-place)
F  → Criar story de Controles Transversais (se houver gaps cross-cutting)
G  → Gerar security-review.md (relatório de auditoria)
```

---

## Kickoff (K)

Antes de iniciar, confirmar com o consultor:

1. **Localização do tasks.json** — default ou caminho customizado?
2. **Escopo da análise** — todas as epics ou subset?
3. **Stack do projeto** — quais linguagens/frameworks? (para calibrar riscos)
4. **Regulatório** — o projeto lida com: dados financeiros? PII/saúde? pagamentos? menores?
5. **Kernel de segurança** — ler `outputs/spec/plano-de-seguranca.md`; ele é a fonte dos `SEC-###` e esta skill não os deriva sozinha
6. **Threat model disponível?** — ler `outputs/spec/threat-model.md` se existir

---

## Passo A — Carregar Insumos

1. Ler `plano-de-seguranca.md` — extrair o **Catálogo SEC** inteiro (`SEC-###`, título, severidade, controle, rastreio à spec). Esse catálogo é o que o Passo E injeta; o que esta skill deriva por conta própria (Passos C e D) é só o que o kernel **não** cobre.
2. Ler `tasks.json` — para cada story, **agregar** os controles de segurança a partir das **suas tasks**: `implementationGuidance.securityConsiderations[]`, `apiContracts[]` e `persistenceModel` de `story.tasks[]`, além dos `businessRules[]` da própria story. Estes campos vivem nas **tasks** (em `implementationGuidance`), não diretamente na story — a análise consolida o que as tasks da story declaram.
3. Ler todos os arquivos da pasta de rules do projeto (`.cursor/rules/` ou `.claude/rules/` — ver `../tools/references/task-pipeline.md` §3) — construir mapa de **controles esperados por camada**
4. Ler `threat-model.md` se disponível — extrair ameaças THR-X-NNN do AS-IS ainda não mitigadas
5. Ler `data-model.json` se disponível — identificar tabelas com dados sensíveis/PII
6. Ler `api-contracts.yaml` se disponível — mapear endpoints sem autenticação/autorização declarada

---

## Passo B — Inventário de Controles Esperados

Construir uma tabela de controles esperados com base nas rules do projeto — uma linha por
controle obrigatório das camadas A–J da `security.mdc` (que o Passo A já leu), com colunas
`Camada | Controle obrigatório | Rule de origem | Implementado nas tasks?`. Ex.:

| Camada | Controle obrigatório | Rule de origem | Implementado nas tasks? |
|--------|---------------------|----------------|------------------------|
| AuthZ | Filtro por owner em toda query de recurso | security.mdc | verificar → |
| Dados | Mascaramento de PII em logs | security.mdc | verificar → |

---

## Passo C — Mapa de Operações × Riscos (por story)

Para cada story em `tasks.json`, executar a análise abaixo.

### C.1 — Classificar operações da story

Identificar o tipo de operação dominante. **Taxonomia: OWASP Top 10:2025 + CWE Top 25 2025**
(ver nota de mudanças abaixo da tabela):

| Tipo de operação | Riscos OWASP prioritários (2025) | STRIDE prioritário |
|-----------------|--------------------------|-------------------|
| Autenticação / Login | A07 (Authentication Failures), A04 (Cryptographic Failures — hash/token), API2 | Spoofing, Info Disclosure |
| Criação de recurso | A05 (Injection), A08 (Integrity), API3 | Tampering, EoP |
| Leitura de recurso | A01, API1 (IDOR) | Info Disclosure |
| Atualização de recurso | A01, A08, API3 | Tampering, EoP |
| Exclusão de recurso | A01, API1 | Tampering |
| Upload de arquivo | A05 (Injection/path), A02 (Security Misconfiguration), API4 | Tampering, DoS |
| Integração externa / webhook | A08, A02 (SSRF), API7 (SSRF) | Spoofing, Tampering |
| Relatório / export de dados | A01, A04 (dados sensíveis sem proteção), API1 | Info Disclosure |
| Configuração / admin | A01, A02 (Security Misconfiguration) | EoP |
| Pagamento / operação financeira | A01, A07, A10 (race condition / condição excepcional) | Tampering, EoP |
| **Build / dependências / release** | **A03 (Software Supply Chain Failures)** | Tampering, EoP |
| **Tratamento de erro / exceções** | **A10 (Mishandling of Exceptional Conditions)** | Info Disclosure, DoS |
| IA / LLM / agente | LLM01, LLM06, ASI01, ASI02 | Spoofing, EoP |

> **Numeração oficial do OWASP Top 10:2025** (usar exatamente esta): A01 Broken Access Control ·
> A02 Security Misconfiguration · A03 Software Supply Chain Failures · A04 Cryptographic Failures ·
> A05 Injection · A06 Insecure Design · A07 Authentication Failures · A08 Software or Data
> Integrity Failures · A09 Security Logging and Alerting Failures · A10 Mishandling of Exceptional
> Conditions.

> **Usar a numeração 2025 acima, não a de 2021** (as categorias foram renumeradas — ex.: Injection
> é A05, não A03; SSRF virou parte de A01/A02, API7 no API Top 10). Classificar todo finding também
> por **CWE Top 25 2025** (campo `security.cwe`).

### C.2 — Verificar controles na story

Para cada story, verificar se os `securityConsiderations[]` **agregados das suas tasks** (`story.tasks[].implementationGuidance.securityConsiderations[]`) cobrem os controles necessários para o tipo de operação. Marcar cada controle como:

- ✅ **COBERTO** — explicitamente mencionado com implementação clara
- ⚠️ **PARCIAL** — mencionado mas sem detalhe de implementação
- ❌ **AUSENTE** — risco identificado sem controle correspondente

### C.3 — Formato de análise por story

```
## [STORY-ID] — <título da story>

**Operação dominante:** <tipo>
**Dados sensíveis:** <PII/financeiro/saúde/nenhum>
**Riscos OWASP mapeados:** A01 · A07 · API1

| Controle | Status | Observação |
|---------|--------|-----------|
| Verificação de owner na query | ✅/⚠️/❌ | |
| Autenticação obrigatória | ✅/⚠️/❌ | |
| Rate limiting | ✅/⚠️/❌ | |
| Validação de input no backend | ✅/⚠️/❌ | |
| Logging de operação sensível | ✅/⚠️/❌ | |

**Gaps identificados:** <lista de controles ❌>

**Tasks SEC a injetar nesta story:**
- [SEC-NNN] <título> — CVSS X.X | Severidade CRÍTICO/ALTO/MÉDIO/BAIXO | OWASP AXX
- [SEC-NNN] <título> — CVSS X.X | Severidade CRÍTICO/ALTO/MÉDIO/BAIXO | OWASP AXX
```

### C.4 — Scoring dos gaps da story

Para cada gap ❌ ou ⚠️, calcular a **severidade Likelihood×Impact + CVSS estimado** antes de passar
ao Passo E. **Esta skill não calcula DREAD** — o rating dos gaps que ela deriva é Likelihood×Impact / CVSS,
ajustado por **EPSS + CISA KEV** nas vulnerabilidades de dependência. O `SEC-###` que vem do kernel
chega com a severidade (e o DREAD) que a `revisao-de-seguranca` deu, e fica como veio: não é
recalculado aqui.

**Rating — Probabilidade × Impacto → Severidade:**

| | Impacto Baixo | Impacto Médio | Impacto Alto |
|---|---|---|---|
| **Probabilidade Alta** | MÉDIO | ALTO | CRÍTICO |
| **Probabilidade Média** | BAIXO | MÉDIO | ALTO |
| **Probabilidade Baixa** | BAIXO | BAIXO | MÉDIO |

**Faixa de CVSS estimado → Severidade** (coerente com a rule `security.md` do projeto):
≥ 9.0 = CRÍTICO · 7.0–8.9 = ALTO · 4.0–6.9 = MÉDIO · < 4.0 = BAIXO. Quando as duas leituras
divergirem, vale a **mais severa**, com a justificativa registrada no finding; empate de
severidade se desempata pelo CVSS estimado e, em dependências, por EPSS/KEV.

Gerar task SEC-NNN para: todos os CRÍTICO e ALTO; MÉDIO quando o esforço de implementação for XS ou S.
MÉDIO com esforço **M ou L** e todo finding **BAIXO** **não** são injetados no `tasks.json` —
entram na seção **"Findings não injetados (backlog futuro)"** do `security-review.md`
(ver Passo G), registrados no formato de finding da rule `security.md` do projeto, para
priorização em sprint futuro (MÉDIO) ou como tech debt (BAIXO).

### C.5 — Vetores de IA / LLM / agentes (condicional)

**Ativar quando** o produto tiver features de IA, LLM, RAG, agentes ou MCP (detectar nas tasks:
uso de SDK de IA, tool calling, memória/contexto persistente). Nesse caso, gerar tasks SEC-NNN
também para os vetores dos frameworks abaixo, além dos OWASP/CWE tradicionais:

| Framework | Vetor | Controle a especificar |
|-----------|-------|------------------------|
| **OWASP Top 10 para Agentic Applications 2026** | **Goal hijacking** (desvio de objetivo do agente) | Validação de objetivo, limites de escopo por tarefa, confirmação humana em ações irreversíveis |
| Agentic 2026 | **Tool misuse / excessive agency** | Princípio do menor privilégio nas tools; allowlist de ferramentas por agente |
| Agentic 2026 | **Memory / context poisoning** | Isolar e validar memória/contexto persistente; não misturar dados não-confiáveis com instruções |
| **OWASP LLM Top 10** | **Prompt injection (LLM01)** | Separar dados de instruções com delimitadores; sanitizar input antes de enviar ao LLM |
| OWASP LLM Top 10 | **Output como dado não-confiável / supply chain de modelos** | Validar output do LLM com schema antes de usar/persistir |

Cada vetor aplicável vira task SEC-NNN (mesmo scoring do C.4) ou entra em "Findings não
injetados" quando MÉDIO/BAIXO fora do critério de injeção.

---

## Passo D — Análise Cross-Cutting

Verificar se **existe pelo menos uma story** dedicada a cada controle transversal abaixo. Se não existir, é um gap que gera uma task SEC-NNN.

| Controle cross-cutting | Story existente? | ID da story | Gap? |
|------------------------|-----------------|-------------|------|
| Setup de autenticação (hash, JWT, sessão) | | | |
| RBAC / política de autorização global | | | |
| Rate limiting (endpoint de auth + operações críticas) | | | |
| Logging e auditoria de operações sensíveis | | | |
| Gestão de segredos / secrets management | | | |
| Hardening de headers HTTP (HSTS, CSP…) | | | |
| Auditoria de dependências no CI (npm audit, pip-audit, osv-scanner…) | | | |
| **Supply chain / build (A03:2025)** — lockfiles fixados, verificação de integridade de build, provenance/SBOM assinada | | | |
| **Tratamento de exceções (A10:2025)** — falha segura (fail-closed), sem estado inconsistente nem stack trace ao usuário | | | |
| LGPD — endpoints de direito do titular (DELETE /me, GET /me/data) | | | |
| Tratamento centralizado de erros (sem stack trace ao usuário) | | | |
| MFA em operações de alto risco (se aplicável) | | | |
| **Segurança de IA/agentes (se o produto tem IA/LLM/MCP)** — ver C.5 | | | |

---

## Passo E — Injetar Tasks SEC-NNN nas Stories (`tasks.json`)

**Este é o passo de escrita.** Para cada gap CRÍTICO, ALTO e MÉDIO elegível (C.4), gerar uma task
auto-suficiente e **adicioná-la ao array `tasks[]` da story afetada** dentro do `tasks.json`.

**A junção é do script, não da mão.** Escreva as tasks SEC (formato do E.1, na ordem E.0-K → derivadas)
num arquivo à parte — ex.: `outputs/spec/tasks-sec.json`, um array — e rode:

```bash
node <dir-desta-skill>/scripts/inject-sec.mjs outputs/spec/tasks.json outputs/spec/tasks-sec.json \
  --kernel outputs/spec/plano-de-seguranca.md \
  [--transversal outputs/spec/story-sec-transversal.json] [--simular]
```

Ele confere a forma de cada task (E.1 e o mapeamento esforço × dias), injeta no início do `tasks[]`
de cada story (E.2), grava `metadata.securityReview` (E.4), escreve `tasks.json.tmp`, roda o
validador de auto-suficiência da `spec-tasks` nele e só então substitui o original, guardando
`tasks.json.bak` (E.0). Exit 1 = recusado, nada escrito — a lista diz o que corrigir. Backlog já
revisado é recusado (`NO_SILENT_REINJECTION`) até o consultor decidir; se ele mandar reprocessar,
rode com `--reprocessar`. Script indisponível → os passos E.0–E.4 abaixo, à mão, com
`TOOL_UNAVAILABLE:inject-sec` no sync-log.

**O Passo E termina reordenando o backlog.** Com o inject-sec em exit 0 (inclusive com a story
transversal do Passo F, que entra pelo `--transversal` da mesma chamada), rode o script de ordem da
`spec-tasks` no `tasks.json`:

```bash
node <skills>/spec-tasks/scripts/order-backlog.mjs --input outputs/spec/tasks.json
```

O inject-sec renumera só o que ele mexeu; a ordem do backlog inteiro é do order-backlog, que lê
`mustImplementFirst` como critério 0 — a story transversal vai para o início do backlog, mesmo
morando noutra epic — e põe cada task SEC no início da sua story (E.2), sem violar dependência
declarada. Rodar de novo não muda nada; no `_change` só o `executionOrder` muda. Script
indisponível → `TOOL_UNAVAILABLE:order-backlog` no sync-log, e a ordem fica a do inject-sec.

### E.0-K — Os `SEC-###` do kernel entram primeiro

Para cada `SEC-###` do Catálogo SEC do `plano-de-seguranca.md` **que pede task**, gerar a task correspondente (formato de E.1) **na story cujas operações o controle protege** — o rastreio à spec do próprio catálogo diz qual —, preservando o **ID do kernel**: a task se chama `SEC-###` com o mesmo número. Só depois disso os gaps dos Passos C e D viram tasks, numeradas **a partir do maior `SEC-###` do kernel**, e a skill passa a **derivar por conta própria só o que o kernel não cobre**. Todo controle derivado (não vindo do kernel) é listado em `## Questões em aberto` do `security-review.md`, com a nota *"não previsto no kernel — candidato a entrar nele"*: o kernel é a fonte única, e o que a revisão por story descobre volta para ele, não para uma segunda lista.

**Quais `SEC-###` do kernel pedem task** — o mesmo critério do C.4, lido no `Status` e na `Severidade` de cada SEC do catálogo:

| No kernel | Vira task? |
|---|---|
| `COBERTO` (em qualquer grafia: `**COBERTO**`, `✅ COBERTO`) | Não — o controle já existe na spec |
| `ADIADO` | Não — entra em «Findings não injetados» do `security-review.md`, com o motivo do adiamento |
| Em aberto (`ABERTO`, `PARCIAL`, `NÃO COBERTO`), `CRÍTICO` ou `ALTO` | **Sim** — é o que o `KERNEL_CONSUMED` cobra |
| Em aberto, `MÉDIO` | Só com esforço XS ou S; com M ou L, «Findings não injetados» |
| Em aberto, `BAIXO` | Não — «Findings não injetados», como tech debt |
| Severidade que não se lê (vazia, ou o placeholder do template) | Conta como **sim** até o kernel ser corrigido |

O `inject-sec.mjs --kernel` aplica esta tabela e lista no relatório o que não cobrou (para o Passo G). Kernel que cita `SEC-NNN` mas de onde o catálogo não foi lido — título ou forma fora do template — sai com exit 2: corrija o kernel antes de seguir.

### E.0 — Backup e atomicidade da escrita

Antes de sobrescrever `tasks.json`: (1) gravar o resultado das injeções em um arquivo
temporário (ex.: `tasks.json.tmp`); (2) validar que o conteúdo é JSON bem formado **e** que
passa no schema `tasks/v5.3`; (3) só então substituir o `tasks.json` original pelo temporário
validado. **Nunca** escrever diretamente por cima do arquivo original sem essa validação
intermediária — um erro de serialização no meio da injeção corromperia a única fonte de
verdade do backlog.

### E.1 — Formato da task SEC-NNN injetada

A task SEC é uma **task v5.3 válida** (valida contra `#/definitions/Task` do schema da `spec-tasks`,
classe `security`). A `spec-tasks` é dona do shape; aqui apenas declaramos `class: "security"` e
preenchemos os campos. Deve ser 100% auto-suficiente — o agente implementador só receberá `tasks.json`.

**Regras de shape (v5.3):**
- `type` = o **tipo da task da story** (`backend`, `frontend`, `integration`, `database`, …) — **nunca** o literal `"task"`.
- `class: "security"`.
- O sumário vai **dentro** de `agentExecutionContext.selfContainedSummary` (≥ 800 caracteres).
- `implementationGuidance` segue o shape do schema: o antigo `control`/`pattern`/`antiPattern` vira **`architecturalDecisions[]`**; o antigo `verificationSteps` vira **`testingStrategy`** (com testes RED/GREEN).
- `severity`/`cvss`/`owasp`/`cwe`/`stride`/`mustCompleteBeforeStoryClose` ficam no sub-objeto **`security{}`** (extensão aditiva do schema; esta skill não calcula DREAD — § C.4).

Exemplo completo e validado: [`spec-tasks/templates/tasks.sec-task-example.json`](../spec-tasks/templates/tasks.sec-task-example.json).

> **Nota de esforço (mapeamento fixo):** toda task SEC-NNN declara `effortEstimate`
> (`XS | S | M | L`) **e** `durationEstimatedDays` derivado dele — **XS = 0,25 · S = 0,5 ·
> M = 1 · L = 2 dias** (é o campo que a `spec-estimate` lê). Espelhar o mesmo valor na coluna
> **Esforço** da tabela "Tasks SEC Injetadas por Story" do `security-review.md` (Passo G).

Ao escrever cada task SEC, ler o esqueleto anotado em
[`references/esqueleto-task-sec.md`](references/esqueleto-task-sec.md) — os placeholders e o mínimo de
cada campo (sumário ≥ 800 caracteres, `dataFlow` com ≥ 10 passos, testes RED/GREEN). O exemplo
preenchido e validado é o `tasks.sec-task-example.json` citado acima.

### E.2 — Regras de injeção

| Regra | Detalhe |
|-------|---------|
| Posição no array | Inserir as tasks SEC **antes** das tasks funcionais da story, ou no início do `tasks[]` |
| `security.mustCompleteBeforeStoryClose: true` | Toda task SEC-NNN tem este flag (no sub-objeto `security{}`) — a story não pode ser fechada sem ela |
| `class: "security"` | Toda task SEC declara a classe `security` |
| `storyId` | Sempre o ID da story onde a task é injetada |
| Numeração | os `SEC-###` do kernel mantêm o ID do kernel; os derivados continuam a numeração a partir do maior `SEC-###` do kernel, em ordem global (não reiniciar por story) |
| Auto-suficiência | `agentExecutionContext.selfContainedSummary` deve explicar o contexto completo (≥ 800 chars) sem referenciar documentos externos |

### E.3 — Verificação pós-injeção

Após injetar todas as tasks SEC no `tasks.json`, conferir cada item do gate
`SEC_TASK_SHAPE_COMPLETE` (tabela de Validators) para cada story com gaps — os critérios são
exatamente os daquele gate; não há segunda lista.

### E.4 — Registro de metadata (evita reinjeção duplicada)

Após concluir e validar as injeções (E.0–E.3), gravar no objeto raiz do `tasks.json`
(`metadata.securityReview`):

```json
{
  "metadata": {
    "securityReview": {
      "reviewedAt": "<ISO-8601>",
      "skillVersion": "<versão desta skill — a do frontmatter deste SKILL.md>",
      "tasksInjected": 0,
      "findingsCritical": 0,
      "findingsHigh": 0
    }
  }
}
```

Se `metadata.securityReview` **já existir** de uma execução anterior, **perguntar ao
consultor** antes de reprocessar: reexecutar do zero substitui as tasks SEC já injetadas, ou
apenas os deltas (novas stories, novos gaps) devem ser aplicados? Isso evita duplicar
tasks SEC-NNN em reprocessamentos do mesmo backlog.

---

## Passo F — Criar Story de Controles Transversais (se necessário)

Gaps identificados no Passo D (cross-cutting) não pertencem a uma story específica. Para eles:

### F.1 — Verificar se já existe story de segurança transversal

Procurar em `tasks.json` por story com título contendo "segurança", "security", "autenticação", "infraestrutura" ou similar. Se existir, injetar as tasks SEC nela.

### F.2 — Criar nova story (se não existir)

Se não houver story adequada, adicionar ao `tasks.json` uma nova story na epic mais adequada (ex.: epic de infraestrutura, fundação técnica ou a primeira epic do backlog):

A story transversal é uma **Story v5.3 válida** (`#/definitions/Story`): `id`
`STORY-SEC-TRANSVERSAL`, `name` (não `title`), `priority: "CRITICAL"`, `userStory` como objeto,
`narrative` completa, `businessRules[]` e `acceptanceCriteria[]` com `statement`, tasks internas
SEC (`class: "security"`, formato do Passo E.1), `generatedBy: "spec-security-review"` e
`mustImplementFirst: true`.

**Ler e usar como molde** (a narrativa é escrita para o projeto real, nunca copiada do exemplo):
[`spec-tasks/templates/tasks.transversal-story-example.json`](../spec-tasks/templates/tasks.transversal-story-example.json).

### F.3 — Garantir dependência

Se o `tasks.json` usar campo `dependencies` nas stories, adicionar `"STORY-SEC-TRANSVERSAL"` como dependência de todas as stories que dependem dos controles transversais.

---

## Passo G — Gerar `security-review.md`

**Path:** `outputs/spec/security-review.md`

O relatório segue o template canônico em
[`./templates/security-review.template.md`](./templates/security-review.template.md).

**Estrutura obrigatória (na ordem):**

1. Cabeçalho (data, versão do `tasks.json` antes/depois, analista)
2. Sumário Executivo
3. Tasks SEC Injetadas por Story
4. Story de Controles Transversais
5. Referência de Auditoria — Findings CRÍTICO e ALTO
6. **Findings não injetados (backlog futuro)** — MÉDIO (esforço M/L) → próximo sprint; BAIXO → tech debt; formato de finding da rule `security.md` do projeto (ver template)
7. Análise de Cobertura por Story
8. Controles Cross-Cutting
9. Ameaças do AS-IS não mitigadas no TO-BE (se `threat-model.md` disponível)
10. Recomendações de Arquitetura de Segurança

---

## Validators (FATAL / WARNING)

| Código | Verificação | Severidade |
|--------|-------------|------------|
| `TASKS_JSON_VALID` | `tasks.json` é JSON válido e passa no schema `tasks/v5.3` após todas as injeções (ver E.0) | FATAL |
| `ALL_STORIES_ANALYZED` | Todas as stories do `tasks.json` foram analisadas (Passo C) — nenhuma pulada | FATAL |
| `SEC_TASK_SHAPE_COMPLETE` | Cada task SEC tem `class: "security"`, `type` real, `selfContainedSummary` ≥ 800 chars, `implementationGuidance` completo, ≥ 2 `acceptanceCriteria`, `tddTests.red`/`green`, `security.mustCompleteBeforeStoryClose: true` | FATAL |
| `CRITICAL_HIGH_INJECTED` | Todo gap CRÍTICO e ALTO identificado em C.4 tem task SEC-NNN injetada — nenhum órfão | FATAL |
| `NO_SILENT_REINJECTION` | Se `metadata.securityReview` já existir, o consultor foi consultado antes de reprocessar (E.4) | FATAL |
| `NON_INJECTED_TRACKED` | Todo finding MÉDIO (esforço M/L) e BAIXO aparece em "Findings não injetados" do relatório | WARNING |
| `CROSS_CUTTING_STORY_RESOLVED` | Gaps cross-cutting do Passo D têm story transversal criada ou reutilizada (Passo F) | WARNING |
| `THREAT_MODEL_CROSSED` | Se `threat-model.md` existir, ameaças THR-X-NNN foram cruzadas com as tasks SEC | WARNING |
| `KERNEL_CONSUMED` | Todo `SEC-###` do Catálogo SEC do `plano-de-seguranca.md` que pede task (tabela do E.0-K: CRÍTICO ou ALTO em aberto) tem task correspondente no `tasks.json` com o **mesmo ID**; nenhum controle derivado repete um do kernel com número diferente — conferido pelo `inject-sec.mjs --kernel` (Decisão 68), que sai com exit 2 se não conseguir ler o catálogo | FATAL |
| `INJECT_SCRIPT_USED` | A injeção do Passo E foi feita pelo `scripts/inject-sec.mjs` (exit 0); escrita à mão só com `TOOL_UNAVAILABLE:inject-sec` registrado no sync-log | WARNING |

**Política de bloqueio:** FATAL impede a conclusão do Passo E/G (não gerar `security-review.md`
nem considerar o `tasks.json` pronto para os próximos passos). WARNING não bloqueia — emitir
com banner `⚠️` no topo do `security-review.md` listando os avisos.

---

## Definição de Pronto

A lista de fechamento são os **Validators** acima — conferir cada código FATAL e WARNING um a um.
Itens sem validator próprio:

- [ ] Tabela de controles cross-cutting do Passo D completa
- [ ] `security-review.md` gerado na estrutura do Passo G

---

## Próxima Etapa

O `tasks.json` já contém as tasks SEC — pronto para os passos seguintes **sem merge adicional**
(relações por skill na tabela Skills irmãs abaixo).

---

## O que NÃO faz
- Não implementa código — apenas identifica gaps e injeta tasks SEC-NNN auto-suficientes.
- Não executa ferramentas de DAST/SAST nem pentest ativo.
- Não revisa código-fonte já implementado — isso é `spec-code-audit` (Fase 12, pós-implementação).
- Não define o shape de Story/Task do backlog — o schema `tasks/v5.3` é propriedade da `spec-tasks`; esta skill só declara `class: "security"` e preenche os campos.
- Não publica o backlog em ferramenta externa (`spec-tasks-azure` faz isso).
- Não estima prazo/custo das tasks SEC — apenas fornece `durationEstimatedDays` via `effortEstimate`; o forecast é da `spec-estimate`.
- Não cria ou numera `GAP-XXX` — gaps de segurança viram tasks SEC-NNN ou entradas em "Findings não injetados", nunca `GAP-XXX`.

## Skills irmãs

| Skill | Fase | Relação com `spec-security-review` |
|-------|------|--------------------------------------|
| `revisao-de-seguranca` | Tempo B, ordem 3 | **Provê `plano-de-seguranca.md`**, o kernel de fonte única: o Catálogo SEC que o Passo E injeta. Esta skill consome o kernel e deriva só o que ele não cobre (`.claude/rules/harness/plan.md`, «Kernels de fonte única») |
| `spec-tasks` | 7 | **Provê `tasks.json`** — entrada obrigatória; dono do schema `tasks/v5.3` que as tasks SEC devem respeitar |
| `spec-legacy` | 1 | Provê `threat-model.md` (AS-IS) — ameaças THR-X-NNN cruzadas no Passo A/G |
| `spec-data-model` | 6a | Provê `data-model.json` — identifica tabelas com PII para priorização de gaps |
| `spec-api-contracts` | 6b | Provê `api-contracts.yaml` — mapeia endpoints sem auth/authz declarada |
| `spec-estimate` | 7.5 | **Consome** o `tasks.json` já com as tasks SEC — esforço entra automaticamente via `durationEstimatedDays` |
| `spec-tasks-azure` | 8 | Publica o backlog com as tasks SEC-NNN incluídas |
| `spec-scaffold` | 9 | Considera dependências de segurança sinalizadas nas tasks SEC ao montar o scaffold |
| `spec-code-audit` | 11 | Verifica pós-implementação se cada task SEC foi efetivamente implementada (`tddTests.green`) |
