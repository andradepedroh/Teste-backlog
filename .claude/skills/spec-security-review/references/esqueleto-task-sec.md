# spec-security-review — esqueleto da task SEC-NNN (Passo E.1)

> Lido ao escrever cada task SEC. As regras de shape e a nota de esforço estão no `SKILL.md`,
> § «E.1 — Formato da task SEC-NNN injetada»; o exemplo preenchido e validado é
> `../spec-tasks/templates/tasks.sec-task-example.json`.

```json
{
  "id": "SEC-NNN",
  "storyId": "<STORY-ID da story onde será injetada>",
  "type": "<tipo da task da story — backend/frontend/integration/database/… (NÃO 'task')>",
  "class": "security",
  "title": "SEC-NNN — <nome do controle a implementar>",
  "description": "<resumo curto do controle a implementar>",
  "effortEstimate": "XS | S | M | L",
  "durationEstimatedDays": 0.0,
  "security": {
    "severity": "CRÍTICO | ALTO | MÉDIO",
    "cvss": 0.0,
    "owasp": ["AXX"],
    "cwe": ["CWE-NNN"],
    "stride": "S | T | R | I | D | E",
    "mustCompleteBeforeStoryClose": true
  },
  "agentExecutionContext": {
    "selfContainedSummary": "<contexto completo e denso, ≥ 800 caracteres, sem referenciar documentos externos: qual vulnerabilidade existe, o risco concreto para o negócio, o controle a implementar e como verificar que está correto>",
    "criticalWarnings": ["<alerta de segurança crítico>"],
    "doNotDo": ["<o que NÃO fazer — e por que é inseguro>"],
    "minimumOutputToDeliver": ["<artefato 1>", "<teste RED/GREEN>"]
  },
  "implementationGuidance": {
    "architecturalDecisions": [
      "Controle: <controle a implementar, independente de linguagem>",
      "Padrão: <padrão correto de implementação>",
      "Anti-padrão: <o que NÃO fazer e por quê>"
    ],
    "dataFlow": ["1. <onde o controle é aplicado no fluxo>", "2. <onde validar>", "… (≥10 passos)"],
    "errorHandling": {
      "CENARIO_INSEGURO": { "scenario": "<...>", "action": "<...>", "userImpact": "<...>" },
      "CENARIO_SEM_AUTENTICACAO": { "scenario": "<...>", "action": "<...>", "userImpact": "<...>" },
      "CENARIO_RECURSO_INEXISTENTE": { "scenario": "<...>", "action": "<...>", "userImpact": "<...>" }
    },
    "observability": {
      "structuredLogging": ["<log de tentativa de ataque / acesso negado>", "<log de acesso negado por autorização>", "<log de operação bem-sucedida>"],
      "metrics": ["<métrica de eventos de segurança>", "<métrica de tentativas negadas>", "<métrica de latência do controle>"],
      "tracing": ["<span relevante>"]
    },
    "securityConsiderations": ["<consideração de segurança>"],
    "testingStrategy": {
      "unitTests": ["<teste RED (prova o ataque, falha SEM o controle)>", "<teste GREEN (passa COM o controle)>"],
      "integrationTests": ["<teste de integração do controle>"]
    }
  },
  "acceptanceCriteria": [
    { "id": "AC-SEC-NNN-01", "statement": "<critério objetivo e testável>" },
    { "id": "AC-SEC-NNN-02", "statement": "<segundo critério>" }
  ],
  "tddTests": {
    "red": "<asserção que prova o ataque — deve falhar SEM o controle>",
    "green": "<asserção que valida a defesa — deve passar COM o controle>"
  },
  "validation": {
    "businessCriteria": ["<critério de negócio de segurança>"],
    "technicalCriteria": ["<critério técnico verificável>"]
  }
}
```
