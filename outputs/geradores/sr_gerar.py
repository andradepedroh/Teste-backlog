"""Gera outputs/spec/security-review.md. Uso: python3 -I sr_gerar.py <raiz> <scratch>"""
import json
import re
import sys
from datetime import date
from pathlib import Path

SPEC = Path(sys.argv[1]) / "outputs" / "spec"
SECS = json.loads((Path(sys.argv[2]) / "tasks-sec.json").read_text(encoding="utf-8"))
T = json.loads((SPEC / "tasks.json").read_text(encoding="utf-8"))
K = (SPEC / "plano-de-seguranca.md").read_text(encoding="utf-8")
KS = {}
for b in re.split(r"\n(?=### SEC-)", K):
    m = re.match(r"### (SEC-\d+) — (.+)", b)
    if m:
        g = lambda f: (re.search(r"\| " + f + r" \| (.*?) \|\n", b) or [0, ""])[1]  # noqa: E731
        KS[m.group(1)] = {"t": m.group(2), "sev": g("Severidade"), "cvss": g("CVSS"), "ow": g("OWASP / STRIDE"), "ctrl": g("Controle esperado"), "st": g("Status"), "r": g("Rastreabilidade")}
st = {s["id"]: s for s in T["stories"]}
por_story = {}
for t in SECS:
    por_story.setdefault(t["storyId"], []).append(t)
fun = [s for s in T["stories"] if s.get("generatedBy") != "spec-security-review"]
cont = lambda sev: sum(1 for t in SECS if t["security"]["severity"] == sev)  # noqa: E731
o = []
w = o.append
w("# Security Review — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)\n")
w(f"**Data:** {date.today().isoformat()} · **tasks.json antes:** 60 histórias / 122 tarefas · **depois:** {len(T['stories'])} histórias / {sum(len(s['tasks']) for s in T['stories'])} tarefas · **Analista:** spec-security-review (simulação; decisor Pedro)\n")
w("> ⚠️ Aviso: o kernel não traz modelo de ameaças do sistema atual (não existe legado), então a seção de ameaças do AS-IS não se aplica.\n")
w("## Sumário Executivo\n")
w("A revisão leu o backlog com olhos de atacante. Os controles vieram do plano de segurança (o kernel, fonte única); a análise por história não achou risco novo que o kernel não cobrisse.\n")
w("| Métrica | Valor |\n|---------|-------|")
for a, b in [("Stories analisadas", len(fun)), ("Stories sem gaps (nenhuma task SEC)", len(fun) - len([s for s in por_story if s != 'STORY-SEC-TRANSVERSAL'])),
             ("Stories com tasks SEC injetadas", len([s for s in por_story if s != 'STORY-SEC-TRANSVERSAL'])), ("Story de controles transversais", "criada (ID: STORY-SEC-TRANSVERSAL, EPIC-007, implementar primeiro)"),
             ("**Tasks SEC-NNN injetadas no tasks.json**", f"**{len(SECS)}**"), ("Tasks CRÍTICO injetadas", cont("CRÍTICO")), ("Tasks ALTO injetadas", cont("ALTO")), ("Tasks MÉDIO injetadas", cont("MÉDIO")),
             ("Findings não injetados (backlog futuro)", 3)]:
    w(f"| {a} | {b} |")
w("\n## Tasks SEC Injetadas por Story\n")
for sid, ts in por_story.items():
    if sid == "STORY-SEC-TRANSVERSAL":
        continue
    w(f"### [{sid}] — {st[sid]['name']}\n")
    w("| Task injetada | Título | Severidade | CVSS | OWASP | Esforço | Controle |\n|--------------|--------|------------|------|-------|---------|---------|")
    for t in ts:
        s = t["security"]
        w(f"| {t['id']} | {KS[t['id']]['t']} | {s['severity']} | {s['cvss']} | {', '.join(s['owasp'])} | {t['effortEstimate']} | {KS[t['id']]['ctrl']} |")
    w("")
w("## Story de Controles Transversais\n")
w("A história `STORY-SEC-TRANSVERSAL` (épico EPIC-007) reúne os controles que valem para a aplicação inteira e vem antes de todas as outras.\n")
w("| Task | Controle cross-cutting | Severidade | CVSS | Esforço |\n|------|----------------------|------------|------|---------|")
for t in por_story.get("STORY-SEC-TRANSVERSAL", []):
    w(f"| {t['id']} | {KS[t['id']]['t']} | {t['security']['severity']} | {t['security']['cvss']} | {t['effortEstimate']} |")
w("\n## Referência de Auditoria — Findings CRÍTICO e ALTO\n")
for t in SECS:
    if t["security"]["severity"] not in ("CRÍTICO", "ALTO"):
        continue
    k = KS[t["id"]]
    s = t["security"]
    w(f"### [{t['id']}] {k['t']} — {s['severity']}\n")
    w(f"**CVSS:** {s['cvss']} | **OWASP:** {k['ow'].split('/')[0].strip()} | **CWE:** {', '.join(s['cwe'])} | **STRIDE:** {s['stride']}")
    w(f"**Camada:** {t['type']} · **História:** {t['storyId']}")
    w(f"**Problema:** {t['description']}")
    w(f"**Risco:** {t['agentExecutionContext']['selfContainedSummary'].split('. CONTROLE')[0].replace('O QUE UM ATACANTE CONSEGUE HOJE: ', '')}.")
    w(f"**Fix:** {k['ctrl']}")
    w(f"**Teste (RED → GREEN):**\n  RED:  {t['tddTests']['red']}\n  GREEN: {t['tddTests']['green']}\n")
w("## Findings não injetados (backlog futuro)\n")
for sid, motivo in [("SEC-014", "ADIADO no kernel: prazos de guarda a definir pelo encarregado de dados (GAP-024)"),
                    ("SEC-019", "ADIADO no kernel: depende da configuração de segundo fator no SSO da instância (TI SEFAZ-MT)"),
                    ("SEC-016", "COBERTO no kernel pela convenção de erro (RFC 7807 sem detalhe interno); conferir na auditoria de cada história — BAIXO, tech debt se faltar")]:
    k = KS[sid]
    w(f"### [{sid}] {k['t']} — {k['sev']}\n")
    w(f"**CVSS:** {k['cvss']} | **OWASP / STRIDE:** {k['ow']}")
    w(f"**Problema:** {k['ctrl']}")
    w(f"**Motivo de não injetar:** {motivo}")
    w(f"**Rastreio:** {re.sub(r'[\\w.-]+\\.md §\\d+', '', k['r'])}\n")
w("| Severidade | Ação |\n|-----------|------|\n| MÉDIO (esforço M/L) | Registrar aqui; priorizar como task no **próximo sprint** — não bloqueia a story atual |\n| BAIXO | Registrar aqui como **tech debt** — sem prazo definido |\n")
w("## Análise de Cobertura por Story\n")
w("Cada história funcional foi lida pela operação dominante. As tarefas já trazem ACL no dado, log sem dado pessoal e erro genérico; o que faltava veio do kernel.\n")
w("| História | Operação dominante | Dados sensíveis | Tasks SEC |\n|----------|--------------------|-----------------|-----------|")
for s in fun:
    nm = s["name"]
    op = ("Integração externa" if any(t["type"] == "integration" for t in s["tasks"]) else "Investigação" if s.get("workItemType") == "SPIKE"
          else "Configuração / admin" if "GOVERNANCA-05" in nm else "Relatório / leitura" if re.search(r"Painel|Visão|Carteira|Consultar|Acompanhar", nm) else "Criação / atualização de recurso")
    dados = "PII (CPF/CNPJ, contato) e dívida tributária" if re.search(r"INGESTAO|QUALIFICADA|REGUAS|GOVERNANCA", nm) else "dívida tributária agregada"
    w(f"| {s['id']} — {nm} | {op} | {dados} | {', '.join(t['id'] for t in por_story.get(s['id'], [])) or '— (sem lacuna além dos controles transversais)'} |")
w("\n## Controles Cross-Cutting\n")
w("| Controle cross-cutting | Story existente? | ID da story | Gap? |\n|------------------------|-----------------|-------------|------|")
for a, b, c, d in [("Setup de autenticação", "Sim — SSO da instância (fora do escopo) e OAuth por fonte", "STORY-001 (SEC-001)", "Não"),
                   ("RBAC / política de autorização global", "Sim", "RF-MOD-GOVERNANCA-01 (SEC-003)", "Não"),
                   ("Rate limiting", "Sim", "STORY-001 (SEC-005)", "Não — valor numérico ainda a definir"),
                   ("Logging e auditoria de operações sensíveis", "Sim", "STORY-SEC-TRANSVERSAL (SEC-011) e RF-MOD-GOVERNANCA-04 (SEC-009)", "Não"),
                   ("Gestão de segredos", "Sim", "STORY-SEC-TRANSVERSAL (SEC-010)", "Não"),
                   ("Hardening de headers HTTP", "Plataforma", "— (cabeçalhos da instância ServiceNow, responsabilidade da TI)", "Não aplicável"),
                   ("Auditoria de dependências no CI", "Não", "—", "Não aplicável: aplicação escopada sem dependências de pacote; detector de segredos no SEC-010"),
                   ("Supply chain / build (A03:2025)", "Parcial", "STORY-SEC-TRANSVERSAL (SEC-017)", "Não — controle de versão no GitHub e escopo travado"),
                   ("Tratamento de exceções (A10:2025)", "Sim", "convenção de erro (SEC-016 coberto)", "Não"),
                   ("LGPD — direitos do titular", "Sim", "RF-MOD-GOVERNANCA-06 (SEC-015)", "Não — exclusão a pedido não se aplica a débito tributário"),
                   ("Tratamento centralizado de erros", "Sim", "convenção de erro", "Não"),
                   ("MFA em operações de alto risco", "Adiado", "SEC-019", "Sim — adiado (SSO da instância)"),
                   ("Segurança de IA/agentes", "—", "—", "Não aplicável: produto sem IA")]:
    w(f"| {a} | {b} | {c} | {d} |")
w("\n## Ameaças do AS-IS não mitigadas no TO-BE\n")
w("Não se aplica: não existe sistema legado, então não há modelo de ameaças do AS-IS para cruzar.\n")
w("## Recomendações de Arquitetura de Segurança\n")
for r in ["Implementar primeiro a história transversal (cofre de credenciais, log sem dado pessoal, escopo travado).",
          "Fechar com a TI o valor numérico do limite de requisições e do tamanho de pacote antes da homologação das fontes (SEC-005).",
          "Confirmar o mecanismo de autenticação do provedor de mensagens assim que ele for escolhido (SEC-008, GAP-004).",
          "Receber a validação jurídica das variáveis por canal para fechar o SEC-012 (GAP-015).",
          "Testar ACL por papel × grupo de tabelas no ATF a cada história, não só no fim."]:
    w(f"- {r}")
w("\n## Questões em aberto\n")
w("Nenhum controle derivado fora do kernel: a análise por história não encontrou risco que o plano de segurança não cobrisse.")
(SPEC / "security-review.md").write_text("\n".join(o) + "\n", encoding="utf-8")
print("ok")
