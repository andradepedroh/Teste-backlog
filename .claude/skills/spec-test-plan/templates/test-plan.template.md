# Plano de Testes — [Nome do Projeto]

**Versão:** 1.0 | **Data:** AAAA-MM-DD | **Gerado por:** spec-test-plan v1.0

> **Como usar este documento:**
> Execute cada caso de teste na ordem indicada dentro de cada épica.
> Marque o resultado como ✅ Aprovado, ❌ Reprovado ou ⏭️ Pulado (com justificativa).
> Em caso de reprovação, capture evidências (print de tela) e abra um chamado.

---

## Metadados

| Campo | Valor |
|-------|-------|
| Projeto | [Nome do Projeto] |
| Épicas cobertas | EPIC-001, EPIC-002 |
| Total de casos de teste | [N] |
| Responsável pelos testes | [A preencher] |
| Ambiente alvo | Homologação |
| Ambiente de integrações (sandbox/mock) | [Sandbox real / simulador — preencher conforme kickoff] |
| Perfis de usuário cobertos | [Lista de perfis/papéis — preencher conforme kickoff] |
| Data de execução | [A preencher] |
| Versão testada | [A preencher] |

---

## Sumário de Execução

| ID | Título | Categoria | Épica | Status |
|----|--------|-----------|-------|--------|
| TC-001 | [Título] | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-002 | [Título] | VALIDAÇÃO | EPIC-001 | ⬜ Pendente |

> Legenda: ⬜ Pendente · ✅ Aprovado · ❌ Reprovado · ⏭️ Pulado

---

## [EPIC-001] — [Nome da Épica]

> **Descrição da épica:** [Breve descrição do que esta épica entrega para o negócio.]

### Pré-requisitos da Épica

- [Dado ou configuração necessária antes de iniciar os testes desta épica]
- [Perfil de usuário necessário]
- [Estado inicial do sistema]

---

### [TC-001] [Título do caso de teste — descrever o que está sendo testado] [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | [O que este teste valida — 1 a 2 frases em linguagem de negócio] |
| **Perfil do testador** | [Ex.: Usuário com perfil Gerente] |
| **RN/RF relacionado** | [Ex.: RF-001, RN-003] |

**Pré-condições:**
- [Pré-condição 1 — o que deve existir antes de começar]
- [Pré-condição 2]

**Passos:**
1. [Ação 1 — use linguagem imperativa: "Acesse", "Clique", "Preencha", "Selecione"]
2. [Ação 2 — inclua valores concretos entre crases: `valor de exemplo`]
3. [Ação 3]
4. [Ação 4]

**Resultado esperado:**
- ✅ [Afirmação do que deve acontecer]
- ✅ [Segunda afirmação, se houver]

**Resultado obtido:** [Preencher durante execução]

**Em caso de falha:** [Instrução de como registrar — ex.: "Capturar print da tela e abrir chamado informando o passo em que falhou."]

---

### [TC-002] [Título do caso de teste] [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | [O que este teste valida] |
| **Perfil do testador** | [Perfil] |
| **RN/RF relacionado** | [IDs] |

**Pré-condições:**
- [Pré-condição]

**Passos:**
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

**Resultado esperado:**
- ✅ [Resultado 1]

**Resultado obtido:** [Preencher durante execução]

**Em caso de falha:** [Instrução]

---

### [TC-003] [Título do caso de teste] [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | [O que este teste valida — qual regra de negócio está sendo exercitada] |
| **Perfil do testador** | [Perfil] |
| **RN/RF relacionado** | [IDs — especialmente a RN que está sendo testada] |

**Pré-condições:**
- [Pré-condição]

**Passos:**
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

**Resultado esperado:**
- ✅ [Resultado 1 — normalmente uma mensagem de erro ou bloqueio esperado]

**Resultado obtido:** [Preencher durante execução]

**Em caso de falha:** [Instrução]

---

## [EPIC-002] — [Nome da Segunda Épica]

### Pré-requisitos da Épica

- [Pré-requisito]

---

### [TC-00N] [Título] [CATEGORIA]

[Seguir a mesma estrutura dos casos acima]

---

## Cobertura RN × Caso

> Toda RN-xxx do `business-rules.md` em escopo deve aparecer em ≥1 caso **ou** ter
> justificativa explícita na coluna Status. Os totais alimentam o gate `TESTPLAN_COVERAGE`
> do sync-log.

| RN | Descrição curta | Casos que cobrem | Status |
|----|-----------------|------------------|--------|
| RN-001 | [resumo da regra] | TC-003, TC-007 | ✅ Coberta |
| RN-00N | [resumo da regra] | — | ⚠️ Não coberta — justificativa: [preencher] |

**Resumo:** casos=[N] (PRINCIPAL=[a], VALIDAÇÃO=[b], REGRA=[c], ACESSO=[d], ESTADO=[e], INTEGRAÇÃO=[f], BORDA=[g]) · RNs cobertas=[X]/[Y] ([Z]%)

---

## Anexo A — Usuários de Teste

| Perfil | Usuário/Login | Senha | Observação |
|--------|---------------|-------|------------|
| [Perfil 1] | [login] | [definir com equipe] | [observação] |
| [Perfil 2] | [login] | [definir com equipe] | [observação] |

---

## Anexo B — Dados Pré-necessários no Ambiente

Liste aqui todos os registros que precisam existir no ambiente de homologação
**antes** de iniciar qualquer caso de teste:

- [Dado 1 — ex.: "Produto 'Produto A' cadastrado com estoque = 10"]
- [Dado 2]
- [Dado 3]

---

## Anexo C — Informações do Ambiente

| Parâmetro | Valor |
|-----------|-------|
| URL do ambiente de homologação | https://homolog.[projeto].com.br |
| Versão da aplicação testada | [preencher antes dos testes] |
| Data de início dos testes | [preencher] |
| Data de encerramento dos testes | [preencher] |
| Testador responsável | [preencher] |
| Revisor / PO aprovador | [preencher] |

---

## Anexo D — Histórico de Versões do Plano

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | AAAA-MM-DD | spec-test-plan | Versão inicial gerada automaticamente |
