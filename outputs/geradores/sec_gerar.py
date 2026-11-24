"""Gera tasks-sec.json e story-sec-transversal.json (spec-security-review). Uso: python3 -I sec_gerar.py <raiz>"""
import json
import re
import sys
from pathlib import Path

SPEC = Path(sys.argv[1]) / "outputs" / "spec"
OUT = Path(sys.argv[2])
K = (SPEC / "plano-de-seguranca.md").read_text(encoding="utf-8")
T = json.loads((SPEC / "tasks.json").read_text(encoding="utf-8"))
st_rf = {}
for s in T["stories"]:
    for r in s.get("traceability", {}).get("requirementIds", []):
        st_rf[r] = s
SEC = {}
for b in re.split(r"\n(?=### SEC-)", K):
    m = re.match(r"### (SEC-\d+) — (.+)", b)
    if m:
        g = lambda f: (re.search(r"\| " + f + r" \| (.*?) \|\n", b) or [0, ""])[1]  # noqa: E731
        SEC[m.group(1)] = {"titulo": m.group(2).strip(), "sev": g("Severidade"), "cvss": float(g("CVSS") or 0), "ow": g("OWASP / STRIDE"),
                           "ctrl": g("Controle esperado"), "rastro": g("Rastreabilidade")}

# ataque = o que um atacante consegue; onde; tipo; esforço; cwe; stride; red; green; passos específicos
D = {
    "SEC-001": ("RF-MOD-INGESTAO-01", "integration", "S", ["CWE-285", "CWE-863"], "S",
                "um sistema parceiro (ou quem roubar a credencial dele) grava débitos de outra fonte, contaminando a carteira de cobrança",
                "Com o usuário de integração do IPVA, enviar um pacote para o recurso da CCF e receber 200 com registros gravados — prova que uma fonte escreve no lugar de outra.",
                "Com a política de acesso por fonte, a mesma chamada recebe 403 ACESSO_NEGADO e nenhuma linha é gravada em débitos nem no lote.",
                ["Criar um usuário de integração por fonte, sem papel de aplicação", "Registrar um cliente OAuth 2.0 por fonte", "Criar a REST API Access Policy de cada Scripted REST API liberando só o usuário da fonte dona", "Na ApiIngestaoBase, conferir que o usuário da chamada é o dono da fonte do caminho antes de abrir lote ou gravar pacote"]),
    "SEC-002": ("RF-MOD-GOVERNANCA-02", "frontend", "M", ["CWE-639"], "I",
                "um atendente lê os casos e os dados de contribuintes atribuídos a colegas, inclusive trocando o identificador no endereço do registro",
                "Atendente A1 abre pelo endereço direto o caso atribuído a A2 e vê o dossiê — prova o acesso indevido (IDOR).",
                "Com a Query Business Rule e a ACL, o mesmo acesso não mostra o registro e a busca global também não o encontra.",
                ["Criar Query Business Rule em x_cbi_caso filtrando assigned_to = usuário atual para o papel cbi_atendente", "Estender o filtro aos contribuintes dos casos do atendente", "Criar ACL de leitura em x_cbi_caso e x_cbi_contribuinte com a mesma condição", "Excluir as tabelas do atendente da busca global quando não houver vínculo"]),
    "SEC-003": ("RF-MOD-GOVERNANCA-01", "backend", "M", ["CWE-285", "CWE-862"], "E",
                "um usuário com papel menor altera dado de origem ou de configuração que não lhe cabe, porque a permissão só existe no menu",
                "Atendente grava pela lista um débito ou um parâmetro e a gravação é aceita — prova a escalada de privilégio.",
                "Com as ACL de tabela e de campo por papel, a mesma gravação é negada e nada muda.",
                ["Montar a matriz papel × tabela (criar, ler, alterar, excluir) para os 5 papéis", "Criar ACL de tabela em todas as tabelas x_cbi_", "Criar ACL de campo nos campos sensíveis", "Negar escrita humana nas tabelas de dado de origem (só a carga grava)"]),
    "SEC-004": ("RF-MOD-GOVERNANCA-03", "frontend", "S", ["CWE-359", "CWE-200"], "I",
                "quem não precisa ver o CPF de pessoa física lê ou exporta a lista inteira de contribuintes com o documento em claro",
                "Coordenador exporta a lista de contribuintes e o arquivo traz CPF completo, sem registro na auditoria — prova o vazamento.",
                "Com a ACL de campo e a restrição de exportação, o CPF sai mascarado (***.***.***-25) e cada exportação gera evento de auditoria.",
                ["Criar ACL de campo no documento mascarando CPF de pessoa física por padrão", "Liberar o documento completo só aos papéis autorizados", "Restringir a exportação de listas aos papéis autorizados", "Gravar evento EXPORTACAO em x_cbi_auditoria_evento a cada exportação"]),
    "SEC-005": ("RF-MOD-INGESTAO-01", "integration", "S", ["CWE-770"], "D",
                "um parceiro com defeito ou mal-intencionado derruba a ingestão enviando pacotes enormes ou chamadas sem parar",
                "Enviar um pacote com 50.000 registros e 600 chamadas por minuto e ver a instância degradar — prova a ausência de limite.",
                "Com o limite, o pacote acima de 1.000 registros recebe 413 PACOTE_GRANDE_DEMAIS, o excesso de chamadas recebe 429 com Retry-After e o lote continua íntegro.",
                ["Ler o limite de requisições e o tamanho máximo do pacote do parâmetro de integração", "Contar chamadas por usuário de integração numa janela de um minuto", "Recusar com 429 e Retry-After acima do limite", "Recusar com 413 o pacote acima do máximo, sem gravar nada dele"]),
    "SEC-006": ("RF-MOD-INGESTAO-02", "integration", "S", ["CWE-20"], "T",
                "um parceiro grava valores fora do domínio, campos extras ou documentos falsos que contaminam a carteira",
                "Enviar registro com tributo inexistente e campo extra «papel» e ver o registro aceito — prova a falta de validação.",
                "Com a validação, o registro sai como REJEITADO com o motivo da lista fechada e o campo extra é recusado.",
                ["Validar tipo, tamanho e lista de valores de cada campo", "Conferir o dígito verificador do CPF/CNPJ", "Recusar campos fora do contrato", "Gravar o registro inválido em rejeitados com motivo e conteúdo original"]),
    "SEC-007": ("RF-MOD-INGESTAO-04", "integration", "S", ["CWE-841"], "T",
                "um reenvio (acidental ou forjado) duplica débitos ou altera dados já gravados",
                "Reenviar o pacote 2 do lote 100 com conteúdo diferente e ver os débitos alterados — prova a falta de controle de repetição.",
                "Com o controle por fonte, lote e sequência, o reenvio idêntico devolve a resposta original e o diferente recebe 409 PACOTE_DIVERGENTE.",
                ["Gravar hash do conteúdo de cada pacote por fonte, lote e sequência", "Reenvio com o mesmo hash devolve a resposta guardada", "Hash diferente na mesma sequência é recusado com 409", "Registro com o mesmo identificador de origem atualiza, nunca duplica"]),
    "SEC-008": ("RF-MOD-REGUAS-06", "integration", "S", ["CWE-287", "CWE-345"], "S",
                "alguém de fora marca comunicações como entregues ou lidas e distorce o retorno das réguas e a atribuição da regularização",
                "Sem credencial do provedor, enviar status ENTREGUE para um identificador conhecido e ver a comunicação mudar — prova a falsificação.",
                "Com a credencial própria do provedor, a chamada sem credencial recebe 401 e a de outro sistema recebe 403; nada muda.",
                ["Criar credencial OAuth 2.0 própria do provedor, só com o escopo de status", "Criar política de acesso que libera o callback só para essa credencial", "Conferir que a comunicação existe antes de aplicar o status", "Registrar e recusar identificador desconhecido"]),
    "SEC-009": ("RF-MOD-GOVERNANCA-04", "backend", "S", ["CWE-778", "CWE-284"], "R",
                "alguém apaga ou altera uma interação, uma versão publicada ou um evento de auditoria e some com a prova do que fez",
                "Coordenador exclui um evento de auditoria pela lista e a exclusão é aceita — prova a trilha adulterável.",
                "Com ACL e regra de negócio de imutabilidade, alteração e exclusão são negadas para todos os papéis, inclusive admin.",
                ["Criar ACL negando update e delete em interação, versão publicada, carteira confirmada e evento de auditoria", "Criar regra de negócio que aborta update e delete nessas tabelas", "Gravar evento com usuário, ação, data e registro afetado", "Testar a negação por papel"]),
    "SEC-010": ("TRANSVERSAL", "infrastructure", "S", ["CWE-798", "CWE-522"], "I",
                "quem lê um script ou uma propriedade da aplicação obtém a credencial OAuth de uma fonte ou do provedor e passa a agir em nome dele",
                "Procurar segredo em scripts e propriedades da aplicação e encontrar a credencial do provedor em texto — prova o vazamento.",
                "Com o registro de credencial protegido da instância, a busca não encontra segredo e a rotação está documentada com data.",
                ["Guardar credenciais OAuth e do provedor em registro de credencial protegido da instância", "Ler a credencial só pelo alias, nunca em texto", "Documentar a rotação periódica e o responsável", "Varrer o repositório com detector de segredos em cada commit"]),
    "SEC-011": ("TRANSVERSAL", "backend", "S", ["CWE-532"], "I",
                "quem tem acesso aos logs da instância obtém CPF, e-mail, telefone ou o texto das mensagens de cobrança",
                "Processar um lote com CPF de teste e encontrar o CPF em claro no log do sistema — prova o vazamento.",
                "Com o log estruturado e mascarado, o log traz só lote, fonte, contagens e duração; o CPF de teste não aparece.",
                ["Criar utilitário de log estruturado único da aplicação", "Permitir só os campos modulo, operacao, idLote, fonte, resultado, qtd, duracaoMs", "Mascarar documento e contato quando precisarem aparecer", "Revisar os pontos de log existentes"]),
    "SEC-012": ("RF-MOD-REGUAS-01", "backend", "S", ["CWE-359", "CWE-200"], "I",
                "uma mensagem de SMS ou WhatsApp expõe valor e natureza da dívida a quem vê a tela do celular do contribuinte, ferindo o sigilo fiscal",
                "Salvar um modelo de SMS com as variáveis valor_total e tributo e ver o modelo aceito — prova a exposição.",
                "Com a lista de variáveis permitidas por canal, o modelo de SMS com variável proibida é recusado ao salvar, com a mensagem «Variável não permitida neste canal»; a lista final depende da validação jurídica (GAP-015).",
                ["Manter, por canal, a lista de variáveis permitidas (SMS e WhatsApp com menos dado que e-mail)", "Conferir o modelo contra a lista ao salvar a régua", "Recusar o modelo com variável proibida e explicar qual", "Deixar a lista parametrizável para receber o resultado da validação jurídica (GAP-015)"]),
    "SEC-013": ("RF-MOD-REGUAS-04", "backend", "S", ["CWE-359"], "I",
                "o sistema envia mensagem de cobrança a quem não autorizou o canal ou já pediu para sair, expondo a SEFAZ a reclamação e a sanção pela LGPD",
                "Contribuinte com opt-out de SMS registrado hoje recebe SMS da régua — prova o envio sem base.",
                "Com a conferência no envio, a comunicação fica SEM_OPT_IN e não sai; ICMS, ITCD e parcelamentos ficam bloqueados enquanto não houver fonte de opt-in (GAP-028).",
                ["Conferir o consentimento vigente do canal no momento do envio", "Respeitar o opt-out no mesmo dia", "Registrar a base legal de cada canal", "Bloquear os segmentos sem fonte de opt-in"]),
    "SEC-015": ("RF-MOD-GOVERNANCA-06", "backend", "S", ["CWE-359"], "I",
                "um pedido do titular sobre seus dados fica sem resposta no prazo legal, ou é respondido com dados de outra pessoa",
                "O encarregado de dados tenta exportar o que o produto guarda de um CPF e não há procedimento — prova a lacuna.",
                "Com o procedimento, o encarregado gera a exportação do CPF pedido, só com os dados dele, e o pedido fica registrado na auditoria.",
                ["Criar procedimento para o encarregado consultar os dados de um contribuinte", "Gerar a exportação só do contribuinte pedido", "Registrar o pedido e a resposta na auditoria", "Registrar a base legal (obrigação legal de cobrança)"]),
    "SEC-017": ("TRANSVERSAL", "infrastructure", "S", ["CWE-269"], "E",
                "uma alteração global feita pela aplicação abre acesso a dados de outros produtos da instância compartilhada",
                "Encontrar no conjunto de mudanças da aplicação uma ACL ou propriedade global alterada — prova o risco entre escopos.",
                "Com a revisão de escopo, nenhuma mudança fora de x_cbi_ entra sem acordo da TI e o acesso entre escopos é negado por padrão.",
                ["Configurar o acesso entre escopos da aplicação como negado por padrão", "Revisar em cada PR se há objeto fora do escopo x_cbi_", "Registrar o acordo da TI quando uma mudança global for necessária", "Testar que outro escopo não lê tabela x_cbi_"]),
    "SEC-018": ("RF-MOD-GOVERNANCA-05", "frontend", "S", ["CWE-284"], "T",
                "alguém muda o tamanho do grupo de controle ou uma meta para inflar o efeito incremental da cobrança",
                "Coordenador muda o grupo de controle para 0% e a mudança é aceita sem registro — prova a manipulação.",
                "Com a proteção, só o admin altera, o valor fica entre 1% e 20% e o valor anterior e o novo ficam na auditoria.",
                ["Restringir a escrita de parâmetros, faixas e metas ao papel cbi_admin", "Validar limites de cada parâmetro no servidor", "Gravar valor anterior e novo na auditoria", "Mostrar mensagem clara quando o valor sai do limite"]),
}
DIAS = {"XS": 0.25, "S": 0.5, "M": 1, "L": 2}
tarefas = []
for sid_sec, (rf, tipo, esf, cwe, stride, ataque, red, green, passos) in D.items():
    k = SEC[sid_sec]
    story = "STORY-SEC-TRANSVERSAL" if rf == "TRANSVERSAL" else st_rf[rf]["id"]
    ctx = "" if rf == "TRANSVERSAL" else f" A história onde o controle entra é «{st_rf[rf]['name']}»."
    ow = re.findall(r"\b(A\d{2}|API\d+)\b", k["ow"].split("/")[0])
    sev = k["sev"]
    resumo = (f"O QUE UM ATACANTE CONSEGUE HOJE: {ataque}. CONTROLE A IMPLEMENTAR: {k['ctrl']}.{ctx} "
              f"CONTEXTO: a Cobrança Inteligente roda como aplicação escopada x_cbi_ numa instância ServiceNow compartilhada com outros produtos da SEFAZ-MT, guarda dívida tributária e dado pessoal de cerca de 1,8 milhão de contribuintes, usa SSO da instância para usuários e OAuth 2.0 com um usuário de integração por fonte nas interfaces de lote. "
              f"COMO FAZER: " + "; ".join(f"({i}) {p}" for i, p in enumerate(passos, 1)) + ". "
              f"COMO PROVAR: antes do controle, {red[0].lower() + red[1:]} Depois do controle, {green[0].lower() + green[1:]} "
              f"SEVERIDADE: {sev}, nota de risco {k['cvss']} de 10 (CVSS); classificação {k['ow']}. A história só fecha com este controle pronto e com os testes de ataque e de defesa passando.")
    tarefas.append({
        "id": sid_sec, "storyId": story, "type": tipo, "class": "security",
        "title": f"{sid_sec} — {k['titulo']}", "description": f"{k['ctrl']}. Risco que fecha: {ataque}.",
        "effortEstimate": esf, "durationEstimatedDays": DIAS[esf],
        "security": {"severity": sev, "cvss": k["cvss"], "owasp": ow or ["A01"], "cwe": cwe, "stride": stride, "mustCompleteBeforeStoryClose": True, "kernelRef": sid_sec},
        "agentExecutionContext": {"selfContainedSummary": resumo,
                                  "criticalWarnings": ["Permissão no dado (ACL), nunca só no menu ou no Client Script", "Nenhum dado pessoal em log, mensagem de erro ou teste", "Nada fora do escopo x_cbi_ sem acordo da TI SEFAZ-MT"],
                                  "doNotDo": ["Não liberar ACL com condição verdadeira para destravar teste — abre o dado para todos", "Não usar usuário com papel admin em integração — qualquer vazamento vira acesso total"],
                                  "minimumOutputToDeliver": ["Controle configurado: " + passos[0], "Teste de ataque (falha sem o controle) e teste de defesa (passa com o controle) no ATF", "Evento de auditoria ou log da tentativa negada"]},
        "implementationGuidance": {
            "architecturalDecisions": [f"Controle: {k['ctrl']}", "Padrão: permissão avaliada no servidor (ACL, política de acesso ou Script Include), com código de erro tipado e mensagem em português", "Anti-padrão: esconder a opção na tela e confiar nisso — o acesso direto pelo endereço ou pela interface de lote continua aberto"],
            "dataFlow": [f"{i}. {p}" for i, p in enumerate(passos, 1)] + [
                "5. A requisição chega pelo SSO (usuário) ou pelo OAuth da fonte (sistema)",
                "6. A plataforma avalia a política ou a ACL antes de ler ou gravar",
                "7. Se negar, o sistema devolve erro genérico em português, sem detalhe interno",
                "8. A tentativa negada vai para o log estruturado, sem dado pessoal",
                "9. Se permitir, a operação segue e grava normalmente",
                "10. A ação relevante gera evento em x_cbi_auditoria_evento",
                "11. A métrica de tentativas negadas é atualizada"],
            "errorHandling": {
                "TENTATIVA_NEGADA": {"scenario": ataque[0].upper() + ataque[1:], "action": "Negar no servidor e registrar a tentativa", "userImpact": "Mensagem genérica de falta de permissão ou de erro, sem revelar o dado"},
                "SEM_AUTENTICACAO": {"scenario": "Chamada sem sessão ou sem token válido", "action": "Recusar antes de qualquer leitura (401)", "userImpact": "A pessoa ou o sistema precisa se autenticar de novo"},
                "REGISTRO_INEXISTENTE": {"scenario": "Identificador que não existe ou não pertence a quem pede", "action": "Responder igual ao caso negado, sem revelar se existe", "userImpact": "Resposta uniforme, sem permitir enumeração"}},
            "observability": {"structuredLogging": ["warn de tentativa negada: {modulo, operacao, controle, resultado} sem dado pessoal", "info de operação permitida com o identificador do lote ou do registro", "error de falha do próprio controle"],
                              "metrics": ["tentativas negadas por controle e por dia", "operações permitidas por papel", "tempo do controle por requisição"], "tracing": ["correlação pelo identificador do lote ou do registro"]},
            "securityConsiderations": [k["ctrl"], "Teste por papel e por fonte", "Sem dado pessoal em log"],
            "testingStrategy": {"unitTests": [f"ATAQUE (falha sem o controle): {red}", f"DEFESA (passa com o controle): {green}"],
                                "integrationTests": [f"ATF ponta a ponta com o usuário de teste do papel envolvido conferindo: {green}"]}},
        "acceptanceCriteria": [{"id": f"AC-{sid_sec}-01", "statement": green}, {"id": f"AC-{sid_sec}-02", "statement": "A tentativa negada fica registrada no log estruturado, sem dado pessoal, e as operações legítimas continuam funcionando."}],
        "tddTests": {"red": red, "green": green},
        "validation": {"businessCriteria": [green], "technicalCriteria": ["Teste de ataque falha sem o controle e passa com ele", "Nenhum dado pessoal no log"]},
        "traceability": {"kernel": sid_sec, "rastreio": re.sub(r"\s*·?\s*[\w.-]+\.md\s*§\d+", "", k["rastro"])}})

transversal = {
    "id": "STORY-SEC-TRANSVERSAL", "epicId": "EPIC-007", "name": "Controles de segurança transversais da aplicação", "priority": "CRITICAL", "adoWorkItemType": "User Story",
    "workItemType": "ENABLER",
    "userStory": {"asA": "equipe de desenvolvimento da Cobrança Inteligente", "iWant": "colocar no lugar os controles de segurança que valem para a aplicação inteira", "soThat": "nenhuma funcionalidade vá para produção com credencial exposta, dado pessoal em log ou alteração fora do escopo da aplicação"},
    "narrative": {"elevatorPitch": "Como equipe de desenvolvimento, quero guardar as credenciais em cofre, tirar dado pessoal dos logs e travar o escopo da aplicação antes das funcionalidades, para que a cobrança nasça sobre uma base segura numa instância compartilhada.",
                  "context": "A aplicação roda numa instância ServiceNow compartilhada com outros produtos da SEFAZ-MT e trata dado pessoal e dívida tributária de cerca de 1,8 milhão de contribuintes. Três controles não pertencem a uma funcionalidade só: credenciais das fontes e do provedor em cofre com rotação, log sem dado pessoal e nenhuma alteração fora do escopo x_cbi_. Esta história vem antes das demais.",
                  "problem": "Sem esses controles, cada funcionalidade trataria credencial, log e escopo de um jeito, abrindo vazamento de dado pessoal e risco para os outros produtos da instância.",
                  "deliveredValue": "Uma base única de segurança, reaproveitada por todas as histórias, que reduz o risco de vazamento e de impacto na instância compartilhada.",
                  "actors": ["Equipe de desenvolvimento", "TI SEFAZ-MT"]},
    "businessRules": [{"id": "RN-SEC-TRANSVERSAL-001", "title": "Controles transversais antes das funcionalidades", "description": "Nenhuma funcionalidade da Cobrança Inteligente vai para homologação com a área de negócio antes de as credenciais estarem em cofre, os logs sem dado pessoal e o escopo da aplicação travado; os três controles valem para todas as histórias.", "sourceStoryIds": ["STORY-SEC-TRANSVERSAL"]}],
    "acceptanceCriteria": [{"id": "AC-SEC-T-01", "statement": "Nenhuma credencial aparece em script ou propriedade da aplicação, e a rotação está documentada com responsável."},
                           {"id": "AC-SEC-T-02", "statement": "Os logs da aplicação trazem só lote, fonte, contagens e duração, sem CPF, e-mail, telefone ou texto de mensagem."},
                           {"id": "AC-SEC-T-03", "statement": "Nenhuma mudança fora do escopo x_cbi_ entra sem acordo registrado da TI SEFAZ-MT."}],
    "deliveryScope": [{"taskId": t["id"], "title": t["title"], "businessOutcome": t["acceptanceCriteria"][0]["statement"]} for t in tarefas if t["storyId"] == "STORY-SEC-TRANSVERSAL"],
    "sourceRefs": [{"document": "plano-de-seguranca.md", "section": f"{s} — {SEC[s]['titulo']}", "itemId": s} for s in ("SEC-010", "SEC-011", "SEC-017")],
    "generatedBy": "spec-security-review", "mustImplementFirst": True, "tasks": [],
    "traceability": {"sourceStoryIds": ["STORY-SEC-TRANSVERSAL"], "kernelIds": ["SEC-010", "SEC-011", "SEC-017"]}}
(OUT / "tasks-sec.json").write_text(json.dumps(tarefas, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "story-sec-transversal.json").write_text(json.dumps(transversal, ensure_ascii=False, indent=2), encoding="utf-8")
print(len(tarefas), min(len(t["agentExecutionContext"]["selfContainedSummary"]) for t in tarefas))
