"""Gera outputs/spec/context-map.md (spec-ingest, modo inicial). Uso: python3 -I gerar_context_map.py <raiz-do-repo>"""
import re
import sys
from pathlib import Path

RAIZ = Path(sys.argv[1])
EXP = RAIZ / "outputs" / "explore"
fatos = []          # (fonte, texto, ancora, dominio, conf)
n = [0]


def F(fonte, texto, ancora, dominio, conf="alta"):
    n[0] += 1
    fid = f"F-{n[0]:03d}"
    fatos.append((fonte, fid, texto, ancora, dominio, conf))
    return fid


def cel(s):
    return s.replace("|", "\\|").strip()


def linhas_tabela(texto):
    for l in texto.split("\n"):
        if l.startswith("|") and not re.match(r"^\|[\s:|-]+\|$", l):
            yield [c.strip() for c in l.strip().strip("|").split("|")]


MODS = {}
ids = {}

# ---------------- Fonte 1: outputs/explore/hld-funcional.md
hld = (EXP / "hld-funcional.md").read_text(encoding="utf-8")
sec2 = hld.split("## 2.")[1].split("## 3.")[0]
for c in linhas_tabela(sec2):
    if c[0].startswith("MOD-"):
        MODS[c[0]] = c[1]
        ids[c[0]] = F("hld", f"O módulo {c[1]} ({c[0]}) existe para: {c[2]}.", f"hld-funcional.md §2 {c[0]}", c[1])
F("hld", "O produto roda como aplicação escopada no ServiceNow (App Engine), com telas nativas de lista e formulário por papel e dois painéis no Platform Analytics; não há tela customizada.", "hld-funcional.md §1", "Plataforma")
F("hld", "Fora do escopo: desenvolver o modelo de score (UFMT), inscrição em dívida ativa e execução fiscal, e a integração ponta a ponta com cada sistema parceiro.", "hld-funcional.md §1", "Escopo")

# ---------------- Fonte 2: outputs/explore/especificacao-funcional.md
ef = (EXP / "especificacao-funcional.md").read_text(encoding="utf-8")
s11 = ef.split("### 1.1")[1].split("### 1.2")[0]
for c in linhas_tabela(s11):
    if c[0] in ("Persona",):
        continue
    F("funcional", f"Persona «{c[0]}» (perfil {c[1]}): {c[2]}.", f"especificacao-funcional.md §1.1 {c[0]}", "Atores")
F("funcional", "A matriz de acesso define cinco perfis operacionais (Gestor de Integração, Coordenador, Atendente, Auditor, Admin); o atendente só acessa os próprios casos e nenhum perfil humano grava dados de origem.", "especificacao-funcional.md §1.2", "Governança, Acesso e Auditoria")
s2 = ef.split("## 2.")[1].split("## 3.")[0]
for c in linhas_tabela(s2):
    if c[0] == "Tela/Aba":
        continue
    F("funcional", f"Tela «{c[0]}» ({c[1]}): {c[2]}. Visível para: {c[3]}.", f"especificacao-funcional.md §2 {c[0]}", "Telas")
s3 = ef.split("## 3.")[1]
mod = None
for bloco in re.split(r"\n### ", s3)[1:]:
    cab = bloco.split("\n")[0]
    mod = cab.split(" — ")[0].strip()
    nome = MODS.get(mod, cab)
    for c in linhas_tabela(bloco):
        if re.match(r"RF-\d{3}$", c[0]):
            ids[c[0]] = F("funcional", f"{c[1]}: {c[2]}.", f"especificacao-funcional.md §3 {mod} {c[0]}", nome)
        elif re.match(r"RN-\d{3}$", c[0]):
            ids[c[0]] = F("funcional", f"Regra: {c[1]} (afeta {c[2]}).", f"especificacao-funcional.md §3 {mod} {c[0]}", nome)

# ---------------- Fonte 3: outputs/explore/especificacao-tecnica.md
et = (EXP / "especificacao-tecnica.md").read_text(encoding="utf-8")
s3t = et.split("## 3.")[1].split("## 4.")[0]
for c in linhas_tabela(s3t):
    if c[0] == "Sistema":
        continue
    F("tecnica", f"Integração com {c[0]} ({c[1].lower()}): {c[2]}. Observação: {c[3]}.", f"especificacao-tecnica.md §3 {c[0]}", "Integrações")
s4t = et.split("## 4.")[1]
for c in linhas_tabela(s4t):
    if c[0] == "Premissa":
        continue
    F("tecnica", f"Premissa técnica «{c[0]}»: {c[1]}.", f"especificacao-tecnica.md §4 {c[0]}", "Plataforma", "média")

# ---------------- Fonte 4: ETF (PDF)
etf = [
    ("A aplicação é escopada no App Engine, com escopo x_cbi_ ainda a confirmar.", "ETF §1.1", "Plataforma"),
    ("Nenhum widget, página de UI Builder, workspace ou portal é construído ou estimado.", "ETF §1.1", "Plataforma"),
    ("Das 12 telas do protótipo, só o Painel Institucional e o Painel do Score viram dashboards; as outras dez viram listas e formulários nativos.", "ETF §1.1 e §6.6", "Telas"),
    ("O Platform Analytics é usado só nos dois painéis, e o licenciamento dele está por confirmar.", "ETF §1.1", "Monitoramento e KPIs"),
    ("Cada fonte é uma Scripted REST API criada na aplicação, que o sistema parceiro chama para enviar os dados; são sete APIs (CCF, MPI, Big Data, IPVA, ITCD, SNE/DT-e e Score UFMT).", "ETF §1.1", "Ingestão e Carteira Consolidada"),
    ("Os sistemas parceiros ainda não podem ser consumidos; as APIs são testadas com lotes simulados e testes de contrato, e a integração ponta a ponta não está estimada.", "ETF §1.1", "Integrações"),
    ("A integração de saída com o provedor de e-mail, SMS e WhatsApp está no escopo, mas o contrato técnico do provedor não é aprofundado.", "ETF §1.1", "Réguas de Cobrança Massificada"),
    ("Autenticação e login ficam com a instância ServiceNow (login nativo ou SSO corporativo); o escopo cobre a autorização por papel e a autenticação das APIs de ingestão.", "ETF §1.1", "Governança, Acesso e Auditoria"),
    ("A estimativa considera um desenvolvedor único, sênior, com 6,5 horas por dia.", "ETF §1.1", "Projeto"),
    ("A estimativa total é de 408 horas, cerca de 12,55 semanas de desenvolvimento solo.", "ETF §2", "Projeto"),
    ("O cronograma sugerido tem 13 semanas, da modelagem de dados à contingência.", "ETF §3", "Projeto"),
    ("O modelo tem 26 tabelas customizadas no escopo x_cbi_, reutiliza sys_user e estende a tabela nativa task para caso e follow-up.", "ETF §4", "Dados"),
    ("Não há tabela própria de ciclo do crédito, de funil nem de fotografia; os indicadores são calculados direto das tabelas.", "ETF §4 e §2.2", "Monitoramento e KPIs"),
    ("Cada envio de uma fonte é um lote composto por pacotes, com identificador do lote como chave de idempotência.", "ETF §4.2 x_cbi_sync_execucao", "Ingestão e Carteira Consolidada"),
    ("O lote de score tem cerca de 1,4 milhão de linhas no exemplo.", "ETF §2.1 API Score UFMT", "Scoring de Liquidez"),
    ("A camada de envio deve suportar a ordem de 22 mil comunicações por dia.", "ETF §2.1 Camada de envio", "Réguas de Cobrança Massificada"),
    ("O grupo de controle tem percentual padrão de 3% da carteira segmentada, com semente gravada na carteira.", "ETF §2.1 Sorteio do grupo de controle", "Qualificação e Parametrização da Carteira"),
    ("A janela de atribuição da regularização é parametrizável, com padrão de 30 dias; o grupo de controle é sempre espontâneo.", "ETF §2.1 Atribuição de origem", "Monitoramento e KPIs"),
    ("O caso recebe numeração CQ-AAAA-NNNN; o parcelamento usa o formato PAR-AAAA-NNNNN.", "ETF §2.1 e §4.2", "Cobrança Qualificada"),
    ("O motivo de rejeição de registro é uma lista fechada: CPF/CNPJ inválido, campo obrigatório ausente, contribuinte não encontrado, formato inválido, outro.", "ETF §4.2 x_cbi_registro_rejeitado", "Ingestão e Carteira Consolidada"),
    ("Os tributos tratados são ICMS Normal, ICMS ST, IPVA e ITCD.", "ETF §4.2 x_cbi_debito", "Ingestão e Carteira Consolidada"),
    ("O contribuinte tem situação de cobrança: sem ação, notificado, em cobrança, regularizado.", "ETF §4.2 x_cbi_contribuinte", "Ingestão e Carteira Consolidada"),
    ("A sinalização coercitiva tem tipos protesto (PGE), notificação coercitiva e outro, e é só informativa.", "ETF §4.2 x_cbi_sinalizacao", "Ingestão e Carteira Consolidada"),
    ("A matriz de acesso por papel é proposta e está marcada [A VALIDAR].", "ETF §6.4", "Governança, Acesso e Auditoria"),
    ("O Painel Institucional é visível só ao Coordenador; o Painel do Score, ao Gestor de Integração e ao Coordenador; o atendente não acessa dashboards e usa a lista Minha fila.", "ETF §6.5", "Monitoramento e KPIs"),
    ("O compartilhamento de dashboards segue os papéis da aplicação mapeados aos papéis nativos do Platform Analytics, ainda [A VALIDAR].", "ETF §6.5", "Monitoramento e KPIs"),
    ("O MPI está em descontinuação e convive com o Big Data, registrando o percentual de regras migradas.", "ETF §2.1 API MPI", "Ingestão e Carteira Consolidada"),
    ("A fonte IPVA tem volume alto e maioria de pessoa física, o que exige tratamento e mascaramento de CPF.", "ETF §2.1 API IPVA", "Ingestão e Carteira Consolidada"),
]
for t, a, d in etf:
    F("etf", t, a, d)

# ---------------- Fonte 5: plano de implementação (PPTX)
plano = [
    ("O plano de implementação 2.6 Cobrança é de setembro de 2026.", "plano slide 1", "Projeto"),
    ("O diagnóstico e o redesenho dos 7 produtos levaram 11 meses; a Etapa 4, implementação e capacitação, dura 7 meses e começa agora.", "plano slide 4", "Projeto"),
    ("O ServiceNow está confirmado como plataforma de desenvolvimento.", "plano slide 4", "Plataforma"),
    ("A responsabilidade pelas integrações com os sistemas da SEFAZ-MT passou para a TI, que analisa as necessidades levantadas.", "plano slide 4", "Integrações"),
    ("A v1 cobre consolidação, qualificação, réguas multicanal, atendimento qualificado e indicadores; réguas e cobrança qualificada estão marcadas como parcialmente atendidas.", "plano slide 7", "Escopo"),
    ("As réguas priorizadas cobrem parcelamentos, IPVA, ITCD, ICMS Normal e ICMS ST.", "plano slide 7", "Réguas de Cobrança Massificada"),
    ("O escopo se organiza em 5 épicos e 6 funcionalidades (F1 a F6), mais transversais de papéis, mascaramento, auditoria e interface nativa.", "plano slide 9", "Escopo"),
    ("O cronograma vai do plano de implementação em dezembro de 2026 ao treinamento e operação assistida em abril de 2027, com construção por squad.", "plano slide 11", "Projeto"),
    ("A homologação tem cinco etapas: preparação, testes integrados, homologação, correção e reteste, aceite e go-live.", "plano slide 13", "Projeto"),
    ("A Coordenação de Cobrança (CPRF) é dona do produto: aprova o roteiro e os critérios de aceite, decide o go/no-go e assina o aceite.", "plano slide 13", "Atores"),
    ("Os atendentes de cobrança são usuários-chave e executam o roteiro de homologação.", "plano slide 13", "Atores"),
    ("A EloGroup monta o roteiro, conduz a homologação e consolida as evidências; o SQUAD Cobrança mantém o ambiente e corrige defeitos.", "plano slide 13", "Atores"),
    ("A TI SEFAZ-MT disponibiliza acessos, credenciais e ambientes dos sistemas integrados.", "plano slide 13", "Atores"),
    ("O 2.6 Cobrança depende de 19 APIs: 5 prontas, 2 parciais, 9 a desenvolver e 3 sem resposta (base 30/09).", "plano slides 22-23", "Integrações"),
    ("As APIs do MPI, do Big Data e do Score UFMT estão sem resposta da TI.", "plano slide 23", "Integrações"),
    ("O controle de contribuintes contumazes é feito pelo sistema Credep, segundo a TI.", "plano slide 22", "Qualificação e Parametrização da Carteira"),
    ("A contratação do WhatsApp precisa ser verificada, e a volumetria do serviço de e-mail institucional precisa ser checada.", "plano slide 22", "Réguas de Cobrança Massificada"),
    ("Há APIs prontas para dados cadastrais (B-Cadastro), vínculo contador–contribuinte, SSO e débitos e parcelamentos da CCF; a de parcelamentos ainda não consulta parcelas em atraso.", "plano slide 23", "Integrações"),
    ("As premissas acordadas com a gestão do contrato (banco de horas, ritos, ambientes, dados, homologação, treinamento, mudança de escopo) estão todas a preencher.", "plano slide 3", "Projeto"),
    ("Riscos declarados: contrato definitivo de cada fonte com o parceiro, contrato do score com a UFMT, licença do Platform Analytics, contrato do provedor de comunicação e matriz de acesso a validar.", "plano slides 14-19", "Projeto"),
]
for t, a, d in plano:
    F("plano", t, a, d)

# ---------------- Fonte 6: wiki TO-BE
wiki = [
    ("A base consolidada tem cerca de 1,8 milhão de contribuintes.", "wiki log.md 2026-06-15", "Ingestão e Carteira Consolidada"),
    ("Histórico de quitação: cerca de 30,9% no ICMS Normal e 22,5% no ICMS ST.", "wiki visao.md §3 Métricas de sucesso", "Monitoramento e KPIs"),
    ("A taxa de retorno de réguas de referência é cerca de 5,15% (valor pago em até 30 dias).", "wiki visao.md §3 Métricas de sucesso", "Monitoramento e KPIs"),
    ("O exemplo do glossário fala em cerca de 500 elegíveis no grupo de controle por ciclo.", "wiki visao.md §2 Grupo de Controle", "Qualificação e Parametrização da Carteira"),
    ("A métrica principal é o crédito tributário recuperado atribuível à cobrança, descontado o efeito do grupo de controle.", "wiki visao.md §3 Métricas de sucesso", "Monitoramento e KPIs"),
    ("Duas métricas de proteção: taxa de regularização espontânea do grupo de controle e reclamações ou opt-out por canal.", "wiki visao.md §3 Guard-rails", "Monitoramento e KPIs"),
    ("Dor do coordenador: a seleção da carteira qualificada é empírica, não auditável nem replicável.", "wiki visao.md §1 Persona Coordenador", "Qualificação e Parametrização da Carteira"),
    ("Dor do coordenador: a distribuição da carteira é manual, por planilhas e Google Drive.", "wiki visao.md §1 Persona Coordenador", "Cobrança Qualificada"),
    ("Dor do coordenador: não há visão gerencial em tempo real; os indicadores dependem de extração e cruzamento manual.", "wiki visao.md §1 Persona Coordenador", "Monitoramento e KPIs"),
    ("Dor do coordenador: o disparo de cobrança exige confirmações manuais em lote, sem régua estruturada.", "wiki visao.md §1 Persona Coordenador", "Réguas de Cobrança Massificada"),
    ("Dor do coordenador: o grupo de controle é montado por sorteio manual, sem cálculo sistemático do efeito incremental.", "wiki visao.md §1 Persona Coordenador", "Qualificação e Parametrização da Carteira"),
    ("Dor do atendente: precisa consultar vários sistemas (CCF, SNE, SUCOM) para montar o histórico antes do contato.", "wiki visao.md §1 Persona Atendente", "Cobrança Qualificada"),
    ("Dor do atendente: risco de abordar contribuinte que já regularizou, porque o status só é atualizado numa foto mensal.", "wiki visao.md §1 Persona Atendente", "Ingestão e Carteira Consolidada"),
    ("Dor do atendente: o histórico de interações é disperso, sem registro estruturado por caso.", "wiki visao.md §1 Persona Atendente", "Cobrança Qualificada"),
    ("O score da UFMT é horizonte H2 na wiki: depende da entrega do modelo, e os dados de cobrança alimentam o modelo a partir de maio de 2026.", "wiki Requisitos/scoring-liquidez.md §2.2", "Scoring de Liquidez"),
    ("A wiki prevê distribuição de casos por vínculo contador ↔ atendente, balanceamento de carga e prioridade.", "wiki visao.md §3 regra 7", "Cobrança Qualificada"),
    ("A wiki prevê disparo em lote de centenas de milhares de comunicações por ciclo sem degradar as telas.", "wiki Requisitos/reguas-cobranca.md §2.3", "Réguas de Cobrança Massificada"),
    ("Não-objetivos: desenvolver o modelo de score e tratar inscrição em dívida ativa ou execução fiscal (PGE e produto 2.4 Contencioso).", "wiki visao.md §1 Não-objetivos", "Escopo"),
]
for t, a, d in wiki:
    F("wiki", t, a, d)

inferencias = [
    ("INF-001", "O protótipo v3 propõe uma «Cobrança Ativa» massificada por telefone (lista de ligações distribuída entre atendentes), separada da cobrança qualificada.", "protótipo v3 (tela-fila); wiki log.md 2026-06-22", "Funcionalidade fora da ETF entra ou sai do escopo sem decisão registrada"),
    ("INF-002", "O protótipo v3 propõe a cobrança qualificada como esteira em cinco estágios (em seleção, caso selecionado, dossiê gerado, condução, desfecho), para poucos casos de grandes devedores.", "protótipo v3 (tela-dossie); wiki log.md 2026-06-22", "O campo de estágio do caso pode não refletir o processo validado"),
    ("INF-003", "O protótipo v3 tira o score do cabeçalho do dossiê e o trata como horizonte H2, o que sugere que o cliente não conta com o score na entrada em produção.", "wiki log.md 2026-06-22 (proto-v2); protótipo v3 (tela-score)", "Planejar F3 na v1 sem o modelo pronto"),
    ("INF-004", "O contato-chave do contribuinte (nome, cargo, telefone, e-mail) é editável no protótipo, o que exige campo e tratamento de dado pessoal que a ETF não modela.", "protótipo v3 (tela-dossie)", "Dado pessoal sem base legal nem modelo definido"),
]

# ---------------- montar o markdown
nomes_fonte = {
    "hld": "outputs/explore/hld-funcional.md",
    "funcional": "outputs/explore/especificacao-funcional.md",
    "tecnica": "outputs/explore/especificacao-tecnica.md",
    "etf": "inputs/especificacoes/etf-cobranca-inteligente.pdf",
    "plano": "inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx",
    "wiki": "inputs/especificacoes/wiki-cobranca-refined/",
}
out = []
for chave, nome in nomes_fonte.items():
    rows = [f for f in fatos if f[0] == chave]
    out.append(f"### Fonte: `{nome}`\n\n#### Fatos atômicos\n\n| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |\n|----|-----------------------------------------------|---------------------------|-------------------|-------|")
    for _, fid, t, a, d, c in rows:
        out.append(f"| {fid} | {cel(t)} | {cel(a)} | {cel(d)} | {c} |")
    out.append("\n#### Inferências *(explicitamente não verbatim)*\n\n| ID | Inferência | Fundamento | Risco |\n|----|------------|------------|-------|\n| — | nenhuma inferência nesta fonte | — | — |\n\n#### Itens ainda não classificados (NCR)\n\n| ID | Texto / fato | Hipótese |\n|----|---------------|----------|\n| — | nenhum | — |\n\n---\n")
out.append("### Fonte: `inputs/prototipo/prototipo-cobranca-v3.html` *(protótipo de validação — só intenção, nunca AS-IS)*\n\n#### Fatos atômicos\n\n| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |\n|----|-----------------------------------------------|---------------------------|-------------------|-------|\n| — | nenhum fato: o protótipo é referência visual; o que ele sugere entra como inferência | — | — | — |\n\n#### Inferências *(explicitamente não verbatim)*\n\n| ID | Inferência | Fundamento | Risco |\n|----|------------|------------|-------|")
for i in inferencias:
    out.append("| " + " | ".join(cel(x) for x in i) + " |")
out.append("\n#### Itens ainda não classificados (NCR)\n\n| ID | Texto / fato | Hipótese |\n|----|---------------|----------|\n| — | nenhum | — |\n")

print(f"fatos: {n[0]}", file=sys.stderr)
for k in ["RF", "RN"]:
    faltam = [f"{k}-{i:03d}" for i in range(1, 56 if k == "RF" else 31) if f"{k}-{i:03d}" not in ids]
    print(k, "sem fato:", faltam, file=sys.stderr)
Path(sys.argv[2]).write_text("\n".join(out), encoding="utf-8")
# índice id -> F para o restante do documento
idx = {k: v for k, v in ids.items()}
Path(sys.argv[3]).write_text("\n".join(f"{k}\t{v}" for k, v in idx.items()) + "\n" + "\n".join(f"{fid}\t{t[:90]}" for _, fid, t, *_ in fatos), encoding="utf-8")
