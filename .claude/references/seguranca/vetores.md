# Vetores de Segurança — Referência Compartilhada do Harness

> Base única de conhecimento de segurança, **agnóstica de projeto**. Lida por:
> `revisao-de-seguranca` (modo `plano-geral`) e `auditoria-de-us`.
> Não conter dados de projeto. Atualizar aqui — nunca duplicar em skills.

## OWASP

**Web (Top 10 2021):** A01 Broken Access Control · A02 Cryptographic Failures ·
A03 Injection · A04 Insecure Design · A05 Security Misconfiguration ·
A06 Vulnerable/Outdated Components · A07 Identification & Authentication Failures ·
A08 Software & Data Integrity Failures · A09 Security Logging & Monitoring Failures ·
A10 Server-Side Request Forgery (SSRF).

**API (Top 10 2023):** API1 BOLA (IDOR) · API2 Broken Authentication ·
API3 Broken Object Property Level Authorization · API4 Unrestricted Resource Consumption ·
API5 Broken Function Level Authorization · API6 Unrestricted Access to Sensitive Business Flows ·
API7 SSRF · API8 Security Misconfiguration · API9 Improper Inventory Management ·
API10 Unsafe Consumption of APIs.

**LLM/Agente:** LLM01 Prompt Injection · LLM02 Insecure Output Handling ·
LLM06 Sensitive Information Disclosure · ASI01 Agent Authorization/Control Hijacking ·
ASI02 Tool/Action Abuse.

## STRIDE

Spoofing · Tampering · Repudiation · Information Disclosure · Denial of Service ·
Elevation of Privilege. Usar para classificar a ameaça de cada operação.

## CVSS

Estimar CVSS v3.1 base (0.0–10.0) por finding: 9.0–10.0 CRÍTICO · 7.0–8.9 ALTO ·
4.0–6.9 MÉDIO · 0.1–3.9 BAIXO. Registrar vetor quando relevante (AV/AC/PR/UI/S/C/I/A).

## DREAD

Scoring 1–3 por critério (Damage, Reproducibility, Exploitability, Affected users,
Discoverability).

| Critério | 1 | 2 | 3 |
|----------|---|---|---|
| Damage | Baixo impacto | Dados de alguns usuários | Dados críticos / RCE |
| Reproducibility | Requer condições | Reproduzível com esforço | Sempre |
| Exploitability | Expert interno | Atacante remoto intermediário | Script / automatizável |
| Affected users | Poucos | Grupo | Todos |
| Discoverability | Oculto | Recon básico | Público |

**Score → Severidade:** 12–15 CRÍTICO · 9–11 ALTO · 7–8 MÉDIO · 5–6 BAIXO.

## Mapa operação × risco

| Operação | OWASP prioritário | STRIDE |
|----------|-------------------|--------|
| Autenticação / Login | A07, A02, API2 | Spoofing, Info Disclosure |
| Criação de recurso | A03, A04, API3 | Tampering, EoP |
| Leitura de recurso | A01, API1 (IDOR) | Info Disclosure |
| Atualização de recurso | A01, A03, API3 | Tampering, EoP |
| Exclusão de recurso | A01, API1 | Tampering |
| Upload de arquivo | A04, A05 | Tampering, DoS |
| Integração externa / webhook | A08, A10 (SSRF) | Spoofing, Tampering |
| Relatório / export de dados | A01, A02, API1 | Info Disclosure |
| Configuração / admin | A01, A05 | EoP |
| Pagamento / operação financeira | A01, A07, race condition | Tampering, EoP |
| IA / LLM / agente | LLM01, LLM06, ASI01, ASI02 | Spoofing, EoP |

## Controles transversais

Catálogo de controles que se aplicam a todo o sistema (avaliados no modo `plano-geral`):
autenticação (hash adaptativo, JWT/sessão) · RBAC / autorização global (filtro por owner) ·
rate limiting (auth + operações críticas) · logging e auditoria de operações sensíveis
(PII mascarada) · gestão de segredos · hardening de headers HTTP (HSTS, CSP) ·
auditoria de dependências no CI · direitos do titular LGPD (DELETE /me, GET /me/data) ·
tratamento centralizado de erros (sem stack trace ao usuário) · MFA em operações de alto risco.
