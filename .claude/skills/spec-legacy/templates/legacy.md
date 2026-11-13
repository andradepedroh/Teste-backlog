# Legado e realidade (AS-IS por domínio)

Status: draft  
Última atualização: YYYY-MM-DD  
Fonte: context-map.md (F-xxx), inputs/, evidência técnica

**Preencher cada subseção ou marcar `PENDÊNCIA:` com pergunta ao cliente. Não usar parágrafos únicos em substituição de listas. Esta skill não cria IDs `GAP-XXX` — toda `PENDÊNCIA:` deve ser consolidada na seção `## Questões em aberto` abaixo.**

<!-- id: legacy-summary -->

## Resumo executivo

- Produto / sistema em foco:
- Estado geral (uma linha factual):

<!-- id: si-global -->

## Segurança da informação — visão global

**Tabela 3-A — Postura de SI:**

| Tema | Estado / política atual | Fonte |
|------|--------------------------|-------|
| Dados pessoais tratados (LGPD) | | |
| Classificação de dados geral | | |
| Política de retenção | | |
| Responsável / DPO | | |
| Certificações/compliance existentes (ISO 27001, SOC 2, PCI-DSS…) | | |
| Política de senha / autenticação | | |
| Gestão de segredos (secrets management) | | |
| Plano de resposta a incidentes | | |

**Tabela 3-B — Cobertura de controles (avaliação global):**

| Domínio de controle | Controle presente? | Eficácia | Observação |
|----------------------|----------------------|----------|------------|
| Autenticação e identidade | sim/não/parcial | adequada/parcial/ausente | |
| Autorização e controle de acesso | sim/não/parcial | | |
| Criptografia em trânsito (TLS) | sim/não/parcial | | |
| Criptografia em repouso | sim/não/parcial | | |
| Auditoria e logging de acessos | sim/não/parcial | | |
| Gestão de segredos e credenciais | sim/não/parcial | | |
| Hardening de dependências / SCA | sim/não/parcial | | |
| Rate limiting e anti-bruteforce | sim/não/parcial | | |
| LGPD: direito de esquecimento e portabilidade | sim/não/parcial | | |

**Tabela 3-C — Fluxos de dados críticos (cross-domínio):**

| Fluxo | Origem → Destino | Dado transportado | Criptografado? | Autenticado? | Logado? |
|-------|--------------------|---------------------|--------------------|-----------------|-----------|
| | | | sim/não | sim/não | sim/não |

---

# Domínio: [Nome]

<!-- id: domain-<slug> -->

## Propósito *(micro)*

- Problema para a organização:
- Problema para o usuário:
- Se este domínio não existisse:
- Limites (o que **não** é este domínio):
- Rasto: *(F-xxx / código / doc)*

## Histórias de usuário

| ID | Como … quero … para … | Ator | Frequência | Fonte |
|----|------------------------|-------|------------|-------|
| HU-…-01 | | | | |

## Indicadores-chave

| KPI | Definição | Baseline | Alvo | Dono | Cadência de revisão | Fonte |
|-----|-----------|----------|------|------|----------------------|-------|
| | | | | | | |

## Processos de negócio

### Processo: [nome]

| Passo | Ator | Sistema | SLA / prazo | Artefato |
|-------|-------|---------|-------------|-----------|
| 1 | | | | |

## Fluxos principais

### FL-…-01 — [nome]

**Feliz:** *(passos numerados)*

1.
2.

**Variantes:**

| ID variante | Condição | Caminho |
|-------------|---------|---------|

## Cenários de falha

| ID | Tipo | Condição | Comportamento atual | Impacto | Fonte |
|----|------|----------|----------------------|---------|-------|
| | operação/dados/integração/humano/segurança/capacidade | | | | |

## Pontos de dor

| ID | Dor | Quem | Quando | Impacto | Fonte |
|----|-----|------|--------|---------|-------|

## Regras de negócio

| ID | Enunciado (linguagem de negócio) | Categoria | Racional (por que existe) | Impacto se violada | Local (arquivo/objeto) | Exceções / Conflitos | Fonte |
|----|----------------------------------|-----------|---------------------------|--------------------|------------------------|----------------------|-------|
| RN-… | | validação/cálculo/compliance | | auditoria/financeiro/operacional | path:linha ou proc/trigger | | |

## Impacto e oportunidades

- Se não mudarmos:
- Se mudarmos:
- Oportunidades não óbvias:

## UI/UX atual

| Superfície (tela/canal) | Estados presentes | Fluxo → HU → RN associados | Problemas de UX | Fonte |
|--------------------------|--------------------|------------------------------|-------------------|-------|
| | | FL-XX / HU-XX / RN-XX | | |

*(Modo Processo-Manual: documentar como "canal atual", ex.: "estado de erro = e-mail de reenvio".)*

## Segurança da informação *(domínio)*

**Tabela 11-A — Inventário de dados e controles de acesso:**

| Dado tratado | Classificação | Base legal LGPD | Quem pode ver | Quem pode alterar | Retenção | Exportado? | Auditado? | Criptografado? | Fonte |
|--------------|----------------|------------------|----------------|---------------------|----------|------------|-----------|------------------|-------|
| | público/interno/confidencial/restrito | consentimento/contrato/obrigação legal/interesse legítimo | | | | sim/não | sim/não | em trânsito/repouso/nenhum | |

**Tabela 11-B — Superfície de ataque do domínio (para alimentar o threat-model):**

| Ponto de entrada | Autenticação atual | Autorização (verificação de dono?) | Rate limiting? | Validação de input? | Exposição externa? | Risco estimado |
|--------------------|-----------------------|---------------------------------------|--------------------|------------------------|------------------------|------------------|
| | nenhuma/básica/token/MFA | sim/não/parcial | sim/não | sim/não | sim/não | alto/médio/baixo |

**Tabela 11-C — Dívida de segurança ativa:**

| ID | Vulnerabilidade conhecida | CVSS estimado | Existe mitigação temporária? | Urgência de correção |
|----|-----------------------------|-----------------|----------------------------------|--------------------------|
| SVD-[DOM]-001 | | | sim/não | crítica/alta/média/baixa |

## Engenharia AS-IS

**Modo Processo-Manual — tabela de ferramentas informais:**

| Ferramenta/Canal | Função | Formato de dado | Volume estimado | Problemas conhecidos |
|-------------------|--------|--------------------|--------------------|-------------------------|
| | | | | |

*(Não é necessário completar os campos de componentes, contratos e observabilidade abaixo quando não há sistema digital.)*

### Componentes e integrações *(Modo Digital)*

| Componente | Função | Interface | Domínios ligados |
|------------|--------|-----------|------------------|
| | | API REST/SOAP/evento/arquivo | |

### Dívida técnica *(Modo Digital)*

| Dívida | Impacto | Urgência |
|--------|---------|----------|
| | | alta/média/baixa |

### Observabilidade · Testes / qualidade · Acoplamento · Stack / libs / padrões

*(Achados dos temas A.6 correspondentes — texto curto ou tabela por tema; N/A declarado quando o tema não se aplica.)*

---

## Questões em aberto <!-- id: open-questions -->

*(Consolidar aqui toda ocorrência de `PENDÊNCIA:` deixada nas dimensões e nas tabelas 3-A/3-B/3-C acima. Esta skill não cria IDs `GAP-XXX` — ver [`../../tools/references/task-pipeline.md`](../../tools/references/task-pipeline.md) para como essas pendências alimentam a geração de tasks nas fases seguintes.)*

| # | Pergunta | Evidência/contexto | Bloqueia próxima fase? |
|---|----------|---------------------|-------------------------|
| | | | |

---

*(Repetir bloco “# Domínio” ou mover para `domains/<slug>.md`.)*
