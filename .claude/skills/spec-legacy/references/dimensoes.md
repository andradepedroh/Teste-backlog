# spec-legacy — as 12 dimensões por domínio (Passo 2)

> Lido ao preencher as dimensões de cada domínio. No skip não se aplica.

### Dimensão 1 — Propósito

Responder os **quatro ângulos**:

- **Para a organização:** que problema de negócio este domínio resolve?
- **Para o usuário:** que problema resolve para quem usa dia a dia?
- **Se não existir:** o que acontece se este domínio não existir no produto?
- **Limites:** o que este domínio **não** é (para não confundir com domínios vizinhos)?

Rasto: F-xxx ou "evidência técnica: arquivo path:linha"

---

### Dimensão 2 — Histórias de Usuário / Trabalhos

Histórias `HU-[DOMÍNIO]-NN` em linguagem 100% de negócio (3–5 por domínio), com ator, frequência,
pré e pós-condição — estrutura da tabela no template. Alimentam `domains[].user_stories` no
`business-map.json`.

---

### Dimensão 3 — Indicadores-chave (KPIs)

KPI com definição de medição, baseline, alvo, dono e cadência — tabela no template.
Se não houver número: `PENDÊNCIA: qual é o valor atual de [métrica]? Como é medido hoje?`

---

### Dimensão 4 — Processos de Negócio

Para cada processo **nomeado**:

**Processo: [nome]**

Gatilho: [evento que inicia o processo]

| Passo | Ator (humano/sistema) | Sistema/Ferramenta envolvida | SLA / prazo | Artefato produzido |
|-------|----------------------|------------------------------|-------------|-------------------|
| 1 | | | | |

**Modo Processo-Manual:** "Sistema/Ferramenta envolvida" pode ser "planilha Excel", "e-mail", "WhatsApp", "papel impresso", etc. Documentar com o mesmo rigor.

**Catálogo canônico (`processes[]` no `business-map.json`):** cada processo `PROC-xxx` com `primary_domain_ids[]`, `steps[]` (`order`, `name`, `actor`, `action`, `outcome`, `exception_paths[]`), **≥ 1 `failure_scenarios[]`** (`scenario`, `business_impact`, `current_recovery` = o que o usuário faz hoje quando falha — nunca vazio) e **≥ 1 `pain_points[]`** (`pain`, `business_cost`, `evidence` = path/objeto real). **Meta ≥ 25** processos com falha+dor ancoradas em sistemas substanciais; abaixo disso, registrar o limite no research log em vez de inventar processos.

---

### Dimensão 5 — Principais Fluxos (feliz + variantes)

Cada fluxo `FL-[DOMÍNIO]-NN` com **caminho feliz numerado** e **variantes**
(`FL-[DOM]-NN-VN`, condição de desvio, caminho alternativo, outcome) — estrutura no template.

---

### Dimensão 6 — Cenários de Falha

`CF-[DOM]-NN` com tipo (operação/dados/integração/humano/segurança/capacidade), condição,
comportamento ATUAL e impacto — tabela no template.

---

### Dimensão 7 — Pontos de Dor

`PD-[DOM]-NN` com quem sofre, quando ocorre, impacto (tempo/custo/risco/satisfação) e evidência —
tabela no template.

---

### Dimensão 8 — Regras de Negócio (catálogo profundo)

Regra de negócio = lógica que **protege dinheiro/compromissos**, garante **compliance legal**, dirige o **estado crítico de uma entidade** ou salvaguarda **integridade transacional**. Onde procurar (agnóstico de stack): validações/`validate*`/`check*`/`calculate*`/`approve*`, serviços de domínio, máquinas de estado (status/transições), triggers, stored procedures, constraints; guardas de rota e validação de schema na UI.

Tabela-resumo por domínio no template (colunas: ID, Enunciado, Categoria, Racional, Impacto se
violada, Local `path:linha` ou proc/trigger, Exceções/Conflitos, Fonte); o **catálogo canônico**
vai para `business_rules[]` no `business-map.json`.

**Profundidade obrigatória por regra** (campos no JSON): `business_rationale`, `business_impact_if_violated` e `example_scenario` **distintos e concretos** (com papéis e valores). Exemplo bom: «Um operador tenta lançar um pagamento acima do limite aprovado para o seu perfil — o sistema deve bloquear e indicar qual regra falhou.» Ruim: «Viola a regra de negócio.»

**Metas e disciplina (proporcionalidade no A.2):** alvo **≥ 50** regras com evidência distinta em sistemas substanciais; **no máximo 3** regras compartilhando o mesmo `local` principal (senão dividir/rebaixar confiança). Se uma sessão não sustentar a meta sem templating, emitir **só as evidenciadas**, registrar o déficit no research log e **não** preencher com duplicatas genéricas.

**Evidência determinística (Passo 0.7):** quando `signals/rules-candidates.json` (ast-grep) existir, ele é a **primeira fonte de candidatos** deste catálogo — o modelo interpreta cada achado (descartando falsos positivos) e **cada `RN-xxx` originada de um achado DEVE citar a evidência `arquivo:linha`** reportada pela varredura no campo `Local`. Sem a varredura (`TOOL_UNAVAILABLE:ast-grep`), minerar as mesmas 12 categorias do catálogo (`tools/ast-grep-rules/`) via leitura/LLM e marcar as RN resultantes com `[sem varredura determinística]`.

---

### Dimensão 9 — Impacto no Negócio e Oportunidades

- **Se não mudarmos:** [o que perdemos — quantificar ou qualificar]
- **Se mudarmos:** [o que ganhamos]
- **Oportunidades não óbvias:** [novos serviços, dados, automações]

**Catálogo de oportunidades (`opportunities[]` no `business-map.json`):** cada `OPP-xxx` **ancorada a uma dor/artefato concreto observado** (`business_problem_solved` cita path/módulo), com `category` (process_improvement/automation/ai_agent/new_feature/integration), `business_value`, `affected_domains[]`, `success_metrics[]`. **Meta ≥ 40** oportunidades incluindo **≥ 8 `ai_agent`** — cada agente com `ai_agent_spec` (`input`, `output`, `financial_value`); evitar "chatbot de FAQ" genérico, preferir agentes de negócio com comportamento autônomo. Se as metas não forem críveis sem fabricar, reduzir e justificar no research log.

> **Fronteira AS-IS:** oportunidades aqui são **observações** ancoradas na realidade atual (onde o negócio perde valor hoje), não desenho de solução/TO-BE. O detalhamento de produto pertence ao `spec-product`; a estimativa de esforço, ao `spec-estimate`.

---

### Dimensão 10 — UI/UX Atual

Superfície (tela/canal) × estados presentes × `FL/HU/RN` associados × problemas de UX — tabela no
template. **Modo Processo-Manual:** documentar como "canal atual" (ex.: "estado de erro = e-mail de
reenvio").

---

### Dimensão 11 — Segurança da Informação (domínio)

Três tabelas obrigatórias — estrutura completa no template:

- **11-A — Inventário de dados e controles de acesso** (classificação, base legal LGPD, quem vê/altera, retenção, criptografia)
- **11-B — Superfície de ataque do domínio** (alimenta o threat-model: autenticação, autorização de dono, rate limiting, exposição)
- **11-C — Dívida de segurança ativa** (`SVD-[DOM]-NNN`, CVSS estimado, mitigação, urgência)

Se não houver dado para qualquer célula: `PENDÊNCIA: [pergunta específica ao cliente]`

---

### Dimensão 12 — Engenharia AS-IS

**Modo Digital / Híbrido:** preencher quando houver código, API, DDL ou diagrama técnico em
`inputs/` — componentes e integrações, dívida técnica, observabilidade, testes, acoplamento e
stack (achados dos temas A.6; estrutura no template).

**Modo Processo-Manual:** substituir pela tabela de ferramentas informais do template
(ferramenta/canal, função, formato de dado, volume, problemas conhecidos) — sem os campos de
componentes e observabilidade.
