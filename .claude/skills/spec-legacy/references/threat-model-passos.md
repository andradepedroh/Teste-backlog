# spec-legacy — como preencher o `threat-model.md` (Passo 6)

> Lido ao gerar o `threat-model.md`. Complementa o template `templates/threat-model.md`. No skip
> não se aplica.

### 6.1 — DFD (Diagrama de Fluxo de Dados)

Construir obrigatoriamente, mesmo em Modo Processo-Manual. Identificar:
- **Atores externos** (usuário, parceiro, sistema externo)
- **Processos** (APIs, serviços, scripts, planilhas operadas por humanos)
- **Data stores** (bancos, arquivos, planilhas, filas, caches)
- **Trust boundaries** (onde o nível de confiança muda — ex.: internet → DMZ → intranet)
- **Fluxos de dados** (quais dados cruzam quais boundaries)

Exemplo Mermaid pronto no template — adaptar aos componentes reais do `architecture.md`.

### 6.2 — Matriz STRIDE (identificação) + severidade estilo CVSS

**STRIDE é o método de identificação** — para cada componente e cada fluxo do DFD, aplicar os
6 vetores. O **rating principal da ameaça é a severidade estilo CVSS**, expressa como
**Likelihood × Impact** (Probabilidade × Impacto), consistente com a `security.md` do projeto.
Para ameaças que são **vulnerabilidade de dependência**, a priorização usa **EPSS + CISA KEV**
(ver §6.3).

**Rating principal — Likelihood × Impact → Severidade:**

| | Impacto Baixo | Impacto Médio | Impacto Alto |
|---|---|---|---|
| **Probabilidade Alta** | MÉDIO | ALTO | CRÍTICO |
| **Probabilidade Média** | BAIXO | MÉDIO | ALTO |
| **Probabilidade Baixa** | BAIXO | BAIXO | MÉDIO |

> **DREAD não é usado neste pipeline.** A Microsoft **abandonou o DREAD** por subjetividade e
> baixa reprodutibilidade dos scores. O rating único e obrigatório é a severidade
> **Likelihood×Impact / CVSS** (para dependências, ajustada por EPSS + CISA KEV). Empate de
> severidade se resolve pelo **CVSS estimado** e, em seguida, pelo impacto de negócio declarado
> — não por score DREAD.

**Matriz STRIDE:** estrutura (colunas e defaults OWASP por categoria) pronta no template —
preencher lá. O default por categoria é ponto de partida: se a ameaça concreta pertencer a outra
categoria, trocar o código e justificar.

**Referência OWASP para mapeamento (OWASP Top 10:2025 — lista oficial):**

| Código | Categoria OWASP Web Top 10:2025 | Análogo em API Top 10 (2023) / LLM Top 10 / Agentic 2026 |
|--------|-----------------------------------|-----------------------------------------------------------|
| A01 | Broken Access Control | API1 BOLA/IDOR · API5 Function Level AuthZ |
| A02 | Security Misconfiguration | API8 Security Misconfiguration · API7 SSRF |
| A03 | **Software Supply Chain Failures** (novo) | API10 Unsafe Consumption of APIs · LLM03 Supply Chain |
| A04 | Cryptographic Failures | API3 Broken Object Property Level AuthZ (exposição excessiva de dados) |
| A05 | Injection | LLM01 Prompt Injection (análogo em LLM) |
| A06 | Insecure Design | API6 Sensitive Business Flows · LLM06 Excessive Agency |
| A07 | Authentication Failures | API2 Broken Authentication |
| A08 | Software or Data Integrity Failures | LLM04 Data & Model Poisoning · ASI01 Goal Hijack |
| A09 | Security Logging and Alerting Failures | — (sem par direto; nos agentes, ausência de trilha de tool calls) |
| A10 | **Mishandling of Exceptional Conditions** (novo) | API4 Unrestricted Resource Consumption · ASI08 Cascading Failures |

> A coluna da direita é **analogia de apoio**, não mapeamento oficial: os catálogos têm escopos
> distintos e um THR pode citar códigos das duas listas.

> **Usar a numeração 2025 desta tabela, não a de 2021** (as categorias foram renumeradas — ex.:
> Injection é A05, não A03; SSRF virou parte de A01/A02). Classificar todo THR também por
> **CWE Top 25 2025**.

### 6.3 — Supply Chain e Dependências (Modo Digital)

Se o legado tem código: listar dependências com vulnerabilidades conhecidas (CVEs abertas).
**Priorizar por EPSS + CISA KEV**, não só CVSS: vulnerabilidade no **KEV** (exploração ativa)
ou com **EPSS alto** sobe de prioridade; CVSS crítico com EPSS baixíssimo e fora do KEV pode
ser rebaixado com justificativa. Referências: EPSS — https://www.first.org/epss/ · KEV — catálogo
CISA. Tabela de dependências no template.

### 6.4 — Threat model executável com OWASP pytm (opcional)

Passo opcional que dá **enumeração mecânica e reprodutível de ameaças por elemento do modelo** —
um checklist **complementar** à varredura manual do STRIDE, não um substituto. Ao ativá-lo, seguir
o roteiro completo em
[`../tools/references/pytm-threat-model.md`](../tools/references/pytm-threat-model.md)
(política de ferramenta, comandos, fluxo em 3 passos, natureza CAPEC dos achados e o acelerador
STRIDE GPT MCP para produtos com IA). Saídas em `outputs/spec/signals/pytm/`; cada achado CAPEC
relevante é reclassificado em STRIDE + OWASP:2025 + CWE na matriz do §6.2.

**Modo degradado (`TOOL_UNAVAILABLE:pytm`):** sem pytm importável nem rota efêmera (ou instalação
não aprovada), seguir com o **STRIDE manual** (§6.2) e registrar a marca no `sync-log.md`. Nunca é
gate FATAL.

### 6.5 — Ameaças AI/LLM (condicional) — Produto com IA/agentes

**Ativar esta seção se** o legado/produto usa LLMs, agentes, RAG, IA generativa, MCP ou
automação com IA. Aplicar **OWASP Top 10 para Agentic Applications 2026 + OWASP LLM Top 10** —
tabela de categorias pronta no template (§9).

### 6.6 — Top Findings por severidade

Após preencher a matriz, listar os **5 findings de maior severidade** (Likelihood×Impact / CVSS;
para dependências, EPSS/KEV) como prioritários — um bloco por finding, formato pronto no template
(§10): severidade, cenário de exploração, impacto, controle TO-BE e task `SEC-NNN` sugerida.

**Modo Processo-Manual:** mesmo raciocínio — as superfícies são planilha, e-mail, WhatsApp, papel
(ex.: planilha por e-mail sem controle de acesso = Info Disclosure CRÍTICO).
