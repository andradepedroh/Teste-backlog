"""Gera outputs/spec/data-model.json a partir da ETF §4 (texto) + mapeamentos do projeto.
Uso: python3 -I dm_gerar.py <etf.txt> <repo>"""
import json
import re
import sys
from pathlib import Path

ETF, REPO = sys.argv[1], Path(sys.argv[2])
L = open(ETF, encoding="utf-8").read().split("\n")

T = r"(String|Reference|Choice|Integer|Boolean|Date/Time|Date|Currency|Decimal)"
rx_full = re.compile(r"^ ?([a-z][a-z0-9_]+)\s{2,}" + T + r"\b(.*)$")
rx_name = re.compile(r"^ ?([a-z][a-z0-9_]+)\s{2,}(.*)$")
rx_type = re.compile(r"^\s+" + T + r"\b(.*)$")

tabs, cur, campo, pend, dcol, tdesc = {}, None, None, None, 85, {}
frag = {}
for i_l, raw in enumerate(L[547:1480]):
    m = re.match(r"^ ?(x_cbi_[a-z_]+)\s*$", raw)
    if m:
        cur = m.group(1); tabs[cur] = []; campo = None; pend = None; tdesc[cur] = ""; frag[cur] = []; hdr = False; continue
    if cur is None or "Página" in raw or "SEFAZ-MT · ServiceNow" in raw:
        continue
    h = re.match(r"^\s*Campo\s+Tipo", raw)
    if h:
        dcol = raw.index("Descrição") - 1; hdr = True; continue
    if cur and hdr and len(raw) > dcol and raw[dcol:].strip():
        frag[cur].append((i_l, raw[dcol:].strip()))
    m = rx_full.match(raw)
    if not m:
        mt = rx_type.match(raw)
        if mt and raw.strip().split()[0] in ("Reference", "Date/Time", "Choice", "String", "Integer", "Currency", "Decimal", "Boolean", "Date") and not rx_name.match(raw):
            pend = (mt.group(1), raw); continue
        mn = rx_name.match(raw)
        if mn and pend:
            campo = {"nome": mn.group(1), "tipo": pend[0], "raw": [pend[1], raw], "row": i_l}; tabs[cur].append(campo); pend = None; continue
        if campo is None:
            if raw.strip():
                tdesc[cur] += " " + raw.strip()
        elif raw.strip():
            campo["raw"].append(raw)
        continue
    campo = {"nome": m.group(1), "tipo": m.group(2), "raw": [raw], "row": i_l}; tabs[cur].append(campo); pend = None


DESC = {}
for t, fs in frag.items():
    rows = [(c["row"], c["nome"]) for c in tabs[t] if "row" in c]
    for r, txt in fs:
        if not rows: break
        alvo = min(rows, key=lambda x: (abs(x[0] - r), -x[0] if r > x[0] else x[0]))[1]
        DESC.setdefault((t, alvo), []).append(txt)


def parse_campo(c):
    obrig, desc, tam, ref = None, [], None, None
    for r in c["raw"]:
        mo = re.search(r"\s(Sim|Não)(\s|$)", r)
        if mo and obrig is None:
            obrig = mo.group(1)
        d = r[dcol:].strip() if len(r) > dcol else ""
        if mo and not d:
            d = r[mo.end():].strip()
        if d:
            desc.append(d)
        mt = re.search(r"String \((\d+)\)", r)
        if mt:
            tam = mt.group(1)
        mr = re.search(r"\((x_cbi_[a-z_]+|sys_user)\)", r)
        if mr:
            ref = mr.group(1)
    return obrig, " ".join(desc).strip(), tam, ref


# relações da §4.3 (completa FK que o parser de campos perdeu)
rel = {}
for raw in L[1480:1620]:
    m = re.match(r"^\s*(x_cbi_[a-z_]+)\s+([a-z_]+)\s+(x_cbi_[a-z_]+|sys_user)\b.*?N:1(\s*\(opcional\))?", raw)
    if m:
        rel[(m.group(1), m.group(2))] = (m.group(3), bool(m.group(4)))

ENT = {  # tabela: (nome entidade, contexto, propósito)
 "x_cbi_fonte": ("Fonte", "MOD-INGESTAO", "Cada sistema de origem que envia débitos ou score por API; guarda prazo de entrega e situação do último lote"),
 "x_cbi_sync_execucao": ("LoteCarga", "MOD-INGESTAO", "Cada lote recebido de uma fonte, com pacotes, contagens e situação; é a trilha operacional da carga e a chave de idempotência do lote"),
 "x_cbi_registro_rejeitado": ("RegistroRejeitado", "MOD-INGESTAO", "Registro recusado na validação, com o motivo e a linha original para reprocesso"),
 "x_cbi_contribuinte": ("Contribuinte", "MOD-INGESTAO", "O contribuinte consolidado, chave da visão única e do isolamento do atendente"),
 "x_cbi_debito": ("Debito", "MOD-INGESTAO", "Cada débito recebido de uma fonte, ligado ao contribuinte"),
 "x_cbi_posicao_tributo": ("PosicaoTributo", "MOD-INGESTAO", "Posição consolidada do contribuinte em cada tributo, gravada na carga para não somar na consulta"),
 "x_cbi_parcelamento": ("Parcelamento", "MOD-INGESTAO", "Parcelamento de débito, com o alerta de risco quando há parcela vencida"),
 "x_cbi_vinculo_economico": ("VinculoEconomico", "MOD-INGESTAO", "Vínculo entre contribuintes do mesmo grupo econômico"),
 "x_cbi_sinalizacao": ("Sinalizacao", "MOD-INGESTAO", "Sinalização de cobrança coercitiva de outra coordenadoria, só informativa"),
 "x_cbi_score": ("Score", "MOD-SCORE", "Score de liquidez recebido da UFMT por lote, com a versão do modelo"),
 "x_cbi_score_faixa": ("ScoreFaixa", "MOD-SCORE", "Faixas parametrizáveis que classificam o score"),
 "x_cbi_criterio_versao": ("CriterioVersao", "MOD-QUALIFICACAO", "Versão numerada dos critérios de qualificação; imutável depois de publicada"),
 "x_cbi_carteira": ("Carteira", "MOD-QUALIFICACAO", "Carteira do ciclo formada por uma versão de critérios; imutável depois de confirmada"),
 "x_cbi_carteira_item": ("CarteiraItem", "MOD-QUALIFICACAO", "Cada contribuinte × tributo da carteira, com segmento, grupo de controle e as marcas de notificado e regularizado"),
 "x_cbi_regua": ("Regua", "MOD-REGUAS", "Régua de cobrança de um segmento"),
 "x_cbi_regua_etapa": ("ReguaEtapa", "MOD-REGUAS", "Etapa da régua: prazo, canal e modelo de mensagem"),
 "x_cbi_template": ("ModeloMensagem", "MOD-REGUAS", "Modelo de mensagem por canal, com variáveis"),
 "x_cbi_consentimento": ("Consentimento", "MOD-REGUAS", "Opt-in e opt-out do contribuinte por canal"),
 "x_cbi_comunicacao": ("Comunicacao", "MOD-REGUAS", "Cada mensagem criada pela régua, com situação de entrega, tentativas e a marca de pagamento em até 30 dias"),
 "x_cbi_caso": ("Caso", "MOD-QUALIFICADA", "Caso de cobrança qualificada (estende a tabela nativa task)"),
 "x_cbi_interacao": ("Interacao", "MOD-QUALIFICADA", "Contato registrado no caso; não pode ser alterado nem excluído"),
 "x_cbi_followup": ("Followup", "MOD-QUALIFICADA", "Lembrete de próximo contato do caso (estende a tabela nativa task)"),
 "x_cbi_regularizacao": ("Regularizacao", "MOD-MONITORAMENTO", "Regularização de débito com a origem atribuída (espontânea ou resposta à cobrança)"),
 "x_cbi_meta": ("Meta", "MOD-MONITORAMENTO", "Meta de regularização por tributo e ciclo"),
 "x_cbi_parametro": ("Parametro", "MOD-GOVERNANCA", "Parâmetros gerais lidos pelas regras por chave"),
 "x_cbi_auditoria_evento": ("EventoAuditoria", "MOD-GOVERNANCA", "Evento de auditoria imutável; aponta o registro por tabela e identificador"),
}
CTX = {
 "MOD-INGESTAO": "Ingestão e Carteira Consolidada", "MOD-QUALIFICACAO": "Qualificação e Parametrização da Carteira",
 "MOD-SCORE": "Scoring de Liquidez", "MOD-REGUAS": "Réguas de Cobrança Massificada", "MOD-QUALIFICADA": "Cobrança Qualificada",
 "MOD-MONITORAMENTO": "Monitoramento e KPIs", "MOD-GOVERNANCA": "Governança, Acesso e Auditoria",
}
TRACE = {  # tabela → [(id, trecho)]
 "x_cbi_fonte": ["RF-MOD-INGESTAO-05", "RF-MOD-INGESTAO-11", "RN-NOVO-ING-006"],
 "x_cbi_sync_execucao": ["RF-MOD-INGESTAO-01", "RF-MOD-INGESTAO-04", "RN-NOVO-ING-005"],
 "x_cbi_registro_rejeitado": ["RF-MOD-INGESTAO-02", "RF-MOD-INGESTAO-08", "RN-NOVO-ING-004"],
 "x_cbi_contribuinte": ["RF-MOD-INGESTAO-03", "RF-MOD-INGESTAO-13", "RN-NOVO-ING-001"],
 "x_cbi_debito": ["RF-MOD-INGESTAO-01", "RF-MOD-INGESTAO-03", "RN-NOVO-ING-001"],
 "x_cbi_posicao_tributo": ["RF-MOD-INGESTAO-03", "RF-MOD-INGESTAO-14", "RN-NOVO-ING-001"],
 "x_cbi_parcelamento": ["RF-MOD-INGESTAO-10"],
 "x_cbi_vinculo_economico": ["RF-MOD-QUALIFICADA-04"],
 "x_cbi_sinalizacao": ["RF-MOD-INGESTAO-12", "RN-NOVO-ING-007"],
 "x_cbi_score": ["RF-MOD-SCORE-01", "RN-NOVO-SCO-001"],
 "x_cbi_score_faixa": ["RF-MOD-SCORE-02", "RN-NOVO-SCO-002"],
 "x_cbi_criterio_versao": ["RF-MOD-QUALIFICACAO-01", "RF-MOD-QUALIFICACAO-02", "RN-NOVO-QUA-001", "RN-NOVO-QUA-005"],
 "x_cbi_carteira": ["RF-MOD-QUALIFICACAO-03", "RF-MOD-QUALIFICACAO-06", "RN-NOVO-QUA-005"],
 "x_cbi_carteira_item": ["RF-MOD-QUALIFICACAO-04", "RF-MOD-QUALIFICACAO-05", "RF-MOD-MONITORAMENTO-01", "RN-NOVO-QUA-003"],
 "x_cbi_regua": ["RF-MOD-REGUAS-01", "RF-MOD-REGUAS-08", "RN-NOVO-REG-003"],
 "x_cbi_regua_etapa": ["RF-MOD-REGUAS-01", "RN-NOVO-REG-003"],
 "x_cbi_template": ["RF-MOD-REGUAS-01", "RF-MOD-REGUAS-05"],
 "x_cbi_consentimento": ["RF-MOD-REGUAS-04", "RN-NOVO-REG-002"],
 "x_cbi_comunicacao": ["RF-MOD-REGUAS-02", "RF-MOD-REGUAS-06", "RF-MOD-REGUAS-07", "RN-NOVO-REG-001"],
 "x_cbi_caso": ["RF-MOD-QUALIFICADA-01", "RF-MOD-QUALIFICADA-02", "RF-MOD-QUALIFICADA-03", "RN-NOVO-CQ-003"],
 "x_cbi_interacao": ["RF-MOD-QUALIFICADA-05", "RN-NOVO-CQ-002"],
 "x_cbi_followup": ["RF-MOD-QUALIFICADA-06"],
 "x_cbi_regularizacao": ["RF-MOD-MONITORAMENTO-02", "RF-MOD-MONITORAMENTO-08", "RN-NOVO-MON-001", "RN-NOVO-MON-003"],
 "x_cbi_meta": ["RF-MOD-MONITORAMENTO-06", "RF-MOD-GOVERNANCA-05"],
 "x_cbi_parametro": ["RF-MOD-GOVERNANCA-05", "RN-NOVO-GOV-003"],
 "x_cbi_auditoria_evento": ["RF-MOD-GOVERNANCA-04", "RN-NOVO-GOV-003"],
}
RN_COL = {  # (tabela, coluna) → regra
 ("x_cbi_contribuinte", "documento"): "RN-NOVO-ING-001", ("x_cbi_debito", "id_origem"): "RN-NOVO-ING-005",
 ("x_cbi_sync_execucao", "id_lote_origem"): "RN-NOVO-ING-005", ("x_cbi_registro_rejeitado", "motivo"): "RN-NOVO-ING-004",
 ("x_cbi_fonte", "status_atual"): "RN-NOVO-ING-006", ("x_cbi_carteira", "semente_sorteio"): "RN-NOVO-QUA-003",
 ("x_cbi_carteira_item", "controle"): "RN-NOVO-QUA-003", ("x_cbi_criterio_versao", "estado"): "RN-NOVO-QUA-005",
 ("x_cbi_criterio_versao", "previa"): "RN-NOVO-QUA-006", ("x_cbi_carteira", "estado"): "RN-NOVO-QUA-005",
 ("x_cbi_consentimento", "opt_in"): "RN-NOVO-REG-002", ("x_cbi_comunicacao", "tentativas"): "RN-NOVO-REG-004",
 ("x_cbi_caso", "prioridade_ordem"): "RN-NOVO-CQ-003", ("x_cbi_regularizacao", "origem"): "RN-NOVO-MON-003",
 ("x_cbi_score", "vigente"): "RN-NOVO-SCO-001", ("x_cbi_regua", "estado"): "RN-NOVO-REG-005",
}

ENUMS = [
 ("Tributo", [("ICMS_NORMAL", "ICMS Normal"), ("ICMS_ST", "ICMS ST"), ("IPVA", "IPVA"), ("ITCD", "ITCD")]),
 ("TributoFonte", [("ICMS_NORMAL", "ICMS Normal"), ("ICMS_ST", "ICMS ST"), ("IPVA", "IPVA"), ("ITCD", "ITCD"), ("MULTIPLOS", "Múltiplos")]),
 ("TributoCriterio", [("ICMS_NORMAL", "ICMS Normal"), ("ICMS_ST", "ICMS ST"), ("IPVA", "IPVA"), ("ITCD", "ITCD"), ("TODOS", "Todos")]),
 ("StatusFonte", [("OK", "OK"), ("EM_TRANSICAO", "Em transição"), ("FALHA", "Falha")]),
 ("StatusLote", [("EM_ANDAMENTO", "Em andamento"), ("OK", "OK"), ("PARCIAL", "Parcial"), ("FALHA", "Falha")]),
 ("OrigemLote", [("RECEBIDO_FONTE", "Recebido da fonte"), ("REPROCESSO", "Reprocesso")]),
 ("MotivoRejeicao", [("DOC_INVALIDO", "CPF/CNPJ inválido"), ("CAMPO_AUSENTE", "Campo obrigatório ausente"), ("CONTRIB_NAO_ENCONTRADO", "Contribuinte não encontrado"), ("FORMATO_INVALIDO", "Formato inválido"), ("OUTRO", "Outro")]),
 ("TipoPessoa", [("PF", "Pessoa física"), ("PJ", "Pessoa jurídica")]),
 ("SegmentoContribuinte", [("MASSIFICADA", "Massificada"), ("QUALIFICADA", "Qualificada"), ("SEM_CARTEIRA", "Sem carteira")]),
 ("StatusCobranca", [("SEM_ACAO", "Sem ação"), ("NOTIFICADO", "Notificado"), ("EM_COBRANCA", "Em cobrança"), ("REGULARIZADO", "Regularizado")]),
 ("StatusCobrancaTributo", [("NOTIFICADO", "Notificado"), ("EM_COBRANCA", "Em cobrança"), ("REGULARIZADO", "Regularizado")]),
 ("Instrumento", [("AUTO_INFRACAO", "Auto de infração"), ("DECLARACAO", "Declaração"), ("OUTRO", "Outro")]),
 ("InstrumentoCriterio", [("AUTO_INFRACAO", "Auto de infração"), ("DECLARACAO", "Declaração"), ("TODOS", "Todos")]),
 ("StatusDebito", [("EM_ABERTO", "Em aberto"), ("PARCELADO", "Parcelado"), ("REGULARIZADO", "Regularizado")]),
 ("StatusParcelamentoPosicao", [("SEM_PARCELAMENTO", "Sem parcelamento"), ("ATIVO", "Ativo"), ("EM_RISCO", "Em risco")]),
 ("StatusParcelamento", [("ATIVO", "Ativo"), ("EM_RISCO", "Em risco"), ("ENCERRADO", "Encerrado")]),
 ("RelacaoVinculo", [("FILIAL", "Filial"), ("CONTROLADORA", "Controladora"), ("OUTRO", "Outro")]),
 ("TipoSinalizacao", [("PROTESTO_PGE", "Protesto (PGE)"), ("NOTIFICACAO_COERCITIVA", "Notificação coercitiva"), ("OUTRO", "Outro")]),
 ("EstadoCriterio", [("RASCUNHO", "Rascunho"), ("PUBLICADA", "Publicada")]),
 ("SegmentoAlvo", [("QUALIFICADA", "Qualificada"), ("MASSIFICADA", "Massificada")]),
 ("EstadoCarteira", [("SIMULACAO", "Simulação"), ("CONFIRMADA", "Confirmada")]),
 ("SegmentoRegua", [("ICMS_NORMAL", "ICMS Normal"), ("ICMS_ST", "ICMS ST"), ("IPVA", "IPVA"), ("ITCD", "ITCD"), ("PARCELAMENTOS_INADIMPLENTES", "Parcelamentos inadimplentes")]),
 ("EstadoRegua", [("RASCUNHO", "Rascunho"), ("ATIVA", "Ativa"), ("PAUSADA", "Pausada")]),
 ("Canal", [("EMAIL", "E-mail"), ("SMS", "SMS"), ("WHATSAPP", "WhatsApp")]),
 ("StatusComunicacao", [("PENDENTE", "Pendente"), ("ENVIADO", "Enviado"), ("ENTREGUE", "Entregue"), ("LIDO", "Lido"), ("FALHA", "Falha"), ("FALHA_DEFINITIVA", "Falha definitiva"), ("SEM_OPT_IN", "Sem opt-in")]),
 ("OrigemCaso", [("CARTEIRA_CONFIRMADA", "Carteira confirmada"), ("ESGOTAMENTO_REGUA", "Esgotamento de régua")]),
 ("EstagioCaso", [("NOVO", "Novo"), ("PRIMEIRO_CONTATO", "1º contato"), ("NEGOCIACAO", "Negociação"), ("FOLLOW_UP", "Follow-up")]),
 ("MotivoEncerramento", [("REGULARIZACAO", "Regularização"), ("OUTRO", "Outro")]),
 ("TipoInteracao", [("LIGACAO", "Ligação"), ("EMAIL", "E-mail"), ("REUNIAO", "Reunião"), ("WHATSAPP", "WhatsApp"), ("SISTEMA", "Sistema")]),
 ("ResultadoInteracao", [("NEGOCIACAO_EM_CURSO", "Negociação em curso"), ("SEM_CONTATO", "Sem contato"), ("PROMESSA_PAGAMENTO", "Promessa de pagamento"), ("RECUSA", "Recusa")]),
 ("OrigemRegularizacao", [("RESPOSTA_COBRANCA", "Resposta à cobrança"), ("ESPONTANEA", "Espontânea")]),
 ("CanalRegularizacao", [("EMAIL", "E-mail"), ("SMS", "SMS"), ("WHATSAPP", "WhatsApp"), ("ATENDIMENTO", "Atendimento")]),
 ("InstrumentoRegularizacao", [("REGUA_MASSIFICADA", "Régua massificada"), ("COBRANCA_QUALIFICADA", "Cobrança qualificada")]),
 ("GrupoParametro", [("INTEGRACAO", "Integração"), ("CARTEIRA", "Carteira"), ("REGUAS", "Réguas"), ("ATRIBUICAO", "Atribuição"), ("ANALYTICS", "Analytics")]),
 ("AcaoAuditoria", [("PUBLICACAO", "Publicação"), ("CONFIRMACAO", "Confirmação"), ("INTERACAO", "Interação"), ("ALTERACAO_PARAMETRO", "Alteração de parâmetro"), ("EXPORTACAO", "Exportação"), ("OUTRO", "Outro")]),
]
ENUM_COL = {
 ("x_cbi_fonte", "tributo_escopo"): "TributoFonte", ("x_cbi_fonte", "status_atual"): "StatusFonte",
 ("x_cbi_sync_execucao", "status"): "StatusLote", ("x_cbi_sync_execucao", "origem"): "OrigemLote",
 ("x_cbi_registro_rejeitado", "motivo"): "MotivoRejeicao", ("x_cbi_contribuinte", "tipo"): "TipoPessoa",
 ("x_cbi_contribuinte", "segmento_atual"): "SegmentoContribuinte", ("x_cbi_contribuinte", "status_cobranca"): "StatusCobranca",
 ("x_cbi_debito", "tributo"): "Tributo", ("x_cbi_debito", "instrumento"): "Instrumento", ("x_cbi_debito", "status"): "StatusDebito",
 ("x_cbi_posicao_tributo", "tributo"): "Tributo", ("x_cbi_posicao_tributo", "status_parcelamento"): "StatusParcelamentoPosicao",
 ("x_cbi_posicao_tributo", "status_cobranca"): "StatusCobrancaTributo", ("x_cbi_parcelamento", "tributo"): "Tributo",
 ("x_cbi_parcelamento", "status"): "StatusParcelamento", ("x_cbi_vinculo_economico", "relacao"): "RelacaoVinculo",
 ("x_cbi_sinalizacao", "tipo"): "TipoSinalizacao", ("x_cbi_criterio_versao", "estado"): "EstadoCriterio",
 ("x_cbi_criterio_versao", "tributo"): "TributoCriterio", ("x_cbi_criterio_versao", "instrumento"): "InstrumentoCriterio",
 ("x_cbi_criterio_versao", "tipo_alvo"): "SegmentoAlvo", ("x_cbi_carteira", "estado"): "EstadoCarteira",
 ("x_cbi_carteira_item", "tributo"): "Tributo", ("x_cbi_carteira_item", "segmento"): "SegmentoAlvo",
 ("x_cbi_regua", "segmento_alvo"): "SegmentoRegua", ("x_cbi_regua", "estado"): "EstadoRegua",
 ("x_cbi_regua_etapa", "canal"): "Canal", ("x_cbi_template", "canal"): "Canal", ("x_cbi_consentimento", "canal"): "Canal",
 ("x_cbi_comunicacao", "tributo"): "Tributo", ("x_cbi_comunicacao", "canal"): "Canal", ("x_cbi_comunicacao", "status"): "StatusComunicacao",
 ("x_cbi_caso", "origem_caso"): "OrigemCaso", ("x_cbi_caso", "estagio"): "EstagioCaso", ("x_cbi_caso", "motivo_encerramento"): "MotivoEncerramento",
 ("x_cbi_interacao", "tipo"): "TipoInteracao", ("x_cbi_interacao", "resultado"): "ResultadoInteracao",
 ("x_cbi_regularizacao", "tributo"): "Tributo", ("x_cbi_regularizacao", "origem"): "OrigemRegularizacao",
 ("x_cbi_regularizacao", "canal"): "CanalRegularizacao", ("x_cbi_regularizacao", "instrumento"): "InstrumentoRegularizacao",
 ("x_cbi_meta", "tributo"): "Tributo", ("x_cbi_parametro", "grupo"): "GrupoParametro", ("x_cbi_auditoria_evento", "acao"): "AcaoAuditoria",
}
TIPO = {"String": "string", "Reference": "reference", "Choice": "choice", "Integer": "integer", "Boolean": "boolean",
        "Date/Time": "glide_date_time", "Date": "glide_date", "Currency": "currency", "Decimal": "decimal"}
NOME_ENT = {t: v[0] for t, v in ENT.items()}
NOME_ENT["sys_user"] = "Usuario"
INDICES = {
 "x_cbi_contribuinte": [("idx_contribuinte_documento", ["documento"], True, "Chave da consolidação: um contribuinte por documento (RN-NOVO-ING-001)")],
 "x_cbi_debito": [("idx_debito_fonte_origem", ["fonte", "id_origem"], True, "Reenvio da fonte atualiza, não duplica (RN-NOVO-ING-005)"), ("idx_debito_contribuinte_status", ["contribuinte", "status"], False, "Débitos em aberto do contribuinte na consolidação")],
 "x_cbi_sync_execucao": [("idx_lote_fonte_origem", ["fonte", "id_lote_origem"], True, "Idempotência do lote (RN-NOVO-ING-005)")],
 "x_cbi_posicao_tributo": [("idx_posicao_contribuinte_tributo", ["contribuinte", "tributo"], True, "Uma posição por contribuinte e tributo"), ("idx_posicao_filtros", ["tributo", "maior_atraso_dias", "total_em_aberto"], False, "Filtros da carteira consolidada e do motor de critérios")],
 "x_cbi_parcelamento": [("idx_parcelamento_origem", ["id_origem"], True, "Chave natural na fonte")],
 "x_cbi_score": [("idx_score_contribuinte_vigente", ["contribuinte", "vigente"], False, "Score vigente do contribuinte na fila e nos critérios")],
 "x_cbi_carteira_item": [("idx_item_carteira_contribuinte", ["carteira", "contribuinte", "tributo"], True, "Um item por contribuinte e tributo na carteira"), ("idx_item_indicadores", ["carteira", "controle", "notificado", "regularizado"], False, "Contagens dos indicadores direto da tabela (RN-NOVO-MON-004)")],
 "x_cbi_consentimento": [("idx_consentimento_contribuinte_canal", ["contribuinte", "canal"], True, "Um consentimento por contribuinte e canal, consultado no envio")],
 "x_cbi_comunicacao": [("idx_comunicacao_provedor", ["id_provedor"], True, "Retorno de status do provedor sem duplicar (SEC-007)"), ("idx_comunicacao_regua_status", ["regua", "status", "data_prevista"], False, "Motor de réguas e reenvio")],
 "x_cbi_caso": [("idx_caso_fila", ["estagio", "prioridade_ordem"], False, "Ordenação da fila do atendente")],
 "x_cbi_meta": [("idx_meta_tributo_ciclo", ["tributo", "ciclo"], True, "Uma meta por tributo e ciclo")],
 "x_cbi_parametro": [("idx_parametro_chave", ["chave"], True, "Parâmetros lidos por chave")],
}

contextos = {c: [] for c in CTX}
faltas = []
for t, campos in tabs.items():
    nome, ctx, prop = ENT[t]
    cols, rels = [], []
    nomes = [c["nome"] for c in campos]
    extras = [(c, alvo, opc) for (tt, c), (alvo, opc) in rel.items() if tt == t and c not in nomes]
    for c, alvo, opc in extras:
        campos.append({"nome": c, "tipo": "Reference", "raw": [f"({alvo}) {'Não' if opc else 'Sim'}"], "via_relacao": True})
        faltas.append(f"{t}.{c}")
    for c in campos:
        obrig, desc, tam, ref = parse_campo(c)
        if (t, c["nome"]) in DESC:
            desc = " ".join(DESC[(t, c["nome"])])
        if c.get("via_relacao"):
            ref = rel[(t, c["nome"])][0]; obrig = "Não" if rel[(t, c["nome"])][1] else "Sim"
            desc = f"Referência a {NOME_ENT.get(ref, ref)} (ETF §4.3)"
        tipo = TIPO[c["tipo"]] + (f"({tam})" if c["tipo"] == "String" and tam else "")
        col = {"name": c["nome"], "type": tipo, "nullable": obrig != "Sim", "operationType": "NEW",
               "notes": (desc or "Campo da ETF §4.2") + (f" · lista: {ENUM_COL[(t, c['nome'])]}" if (t, c["nome"]) in ENUM_COL else "")}
        if (t, c["nome"]) in RN_COL:
            col["businessRuleRef"] = RN_COL[(t, c["nome"])]
        cols.append(col)
        if c["tipo"] == "Reference" and ref:
            rr = rel.get((t, c["nome"]))
            rels.append({"targetEntity": NOME_ENT.get(ref, ref), "type": "MANY_TO_ONE", "foreignKey": c["nome"],
                         "cascade": "NONE", "nullable": obrig != "Sim"})
    ent = {
        "name": nome, "operationType": "NEW", "purpose": prop,
        "dataOwnership": {"mode": "EXTERNAL_LOADED" if ctx == "MOD-INGESTAO" and t not in ("x_cbi_fonte", "x_cbi_sync_execucao", "x_cbi_registro_rejeitado") else ("EXTERNAL_LOADED" if t == "x_cbi_score" else "OWNED"),
                          "source": "APIs de ingestão das fontes (INT-01 a INT-07)" if t in ("x_cbi_contribuinte", "x_cbi_debito", "x_cbi_posicao_tributo", "x_cbi_parcelamento", "x_cbi_vinculo_economico", "x_cbi_sinalizacao", "x_cbi_score") else "aplicação x_cbi_"},
        "tableName": t, "columns": cols, "primaryKey": ["sys_id"], "identifierStrategy": "sys_id gerado pela plataforma ServiceNow",
        "indexes": [{"name": n, "columns": cs, "unique": u, "purpose": p} for n, cs, u, p in INDICES.get(t, [])],
        "relationships": rels,
        "traceability": [{"section": "ETF §4.2", "itemId": t, "excerpt": prop}] + [{"section": "requirements.md / business-rules.md", "itemId": i, "excerpt": f"{nome} sustenta {i}"} for i in TRACE[t]],
    }
    if t in ("x_cbi_caso", "x_cbi_followup"):
        ent["migrationNotes"] = "Estende a tabela nativa task: herda número, atribuição (assigned_to), situação e datas; os campos listados são só os próprios."
    if t == "x_cbi_posicao_tributo":
        ent["migrationNotes"] = "Desnormalização deliberada: total, maior atraso e quantidade são gravados na carga para a carteira e os critérios não somarem ~1,8 milhão de contribuintes na consulta (ETF §2.1; RNF-DES-001). Risco: divergir dos débitos se a consolidação falhar no meio — a consolidação recalcula a posição inteira do contribuinte a cada lote."
    if t == "x_cbi_contribuinte":
        ent["migrationNotes"] = "total_em_aberto e maior_atraso_dias são calculados na consolidação (mesma justificativa da PosicaoTributo). documento guarda só dígitos; CPF mascarado na leitura por ACL de campo (SEC-004)."
    if t == "x_cbi_carteira_item":
        ent["migrationNotes"] = "score_snapshot e valor_snapshot congelam os valores do momento da carteira, para o efeito incremental não mudar quando o score ou o débito mudarem depois (RN-NOVO-MON-005)."
    contextos[ctx].append(ent)

# entidades nativas referenciadas
contextos["MOD-GOVERNANCA"].append({
    "name": "Usuario", "operationType": "EXISTING_REF", "purpose": "Usuário nativo do ServiceNow (sys_user): autor de interação, atendente, quem publica e confirma",
    "dataOwnership": {"mode": "EXTERNAL_PROJECTION", "source": "plataforma ServiceNow (SSO da SEFAZ-MT)"}, "tableName": "sys_user", "columns": [],
    "traceability": [{"section": "ETF §4", "itemId": "sys_user", "excerpt": "reutiliza sys_user para autoria, atendimento e auditoria"}, {"section": "requirements.md", "itemId": "RF-MOD-GOVERNANCA-01", "excerpt": "controle de acesso por papel"}]})

data = {
    "skillVersion": "1.6", "generatedAt": "2026-11-13T21:00:00Z", "outputLanguage": "pt-BR", "schemaVersion": "1",
    "projectName": "Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)",
    "paths": {"specRoot": "outputs/spec", "pipelineRoot": "outputs/spec", "rulesRoot": ".claude/rules"},
    "changelog": [{"version": "1.0", "date": "2026-11-13", "summary": "Modelo inicial greenfield: 26 tabelas x_cbi_ da ETF §4 em 7 contextos (um por módulo), mais a referência nativa sys_user.", "structural": True}],
    "boundedContexts": [{"id": f"BC-{c.replace('MOD-', '')}", "name": CTX[c], "description": f"Entidades do módulo {CTX[c]}; container principal CON-03/CON-04 do hld.md", "moduleIds": [c], "entities": es} for c, es in contextos.items()],
    "enumerations": [{"name": n, "values": [{"value": v, "label": lb} for v, lb in vals], "usedIn": sorted({f"{NOME_ENT[t]}.{c}" for (t, c), e in ENUM_COL.items() if e == n})} for n, vals in ENUMS],
    "asyncChannels": [
        {"kind": "OTHER", "name": "API de ingestão por lote (7 fontes)", "direction": "INBOUND", "operationType": "NEW", "payloadSummary": "Abrir lote, pacotes numerados de registros, fechar lote com a quantidade de pacotes", "retryAndIdempotency": "Fonte reenvia o pacote; controle por fonte + id_lote_origem + sequência; registro por chave natural (RN-NOVO-ING-005)"},
        {"kind": "WEBHOOK", "name": "Retorno de status do provedor", "direction": "INBOUND", "operationType": "NEW", "payloadSummary": "id_provedor e situação de entrega", "retryAndIdempotency": "Status repetido não muda nada (índice único em id_provedor)"},
        {"kind": "SCHEDULED_JOB", "name": "Fechamento do ciclo diário de carga", "direction": "BOTH", "operationType": "NEW", "payloadSummary": "Marca fontes sem entrega como Falha, consolida e grava a última carga", "retryAndIdempotency": "Reexecução recalcula a posição inteira; seguro repetir"},
        {"kind": "SCHEDULED_JOB", "name": "Motor de réguas diário", "direction": "OUTBOUND", "operationType": "NEW", "payloadSummary": "Cria as comunicações devidas e entrega à camada de envio", "retryAndIdempotency": "Uma comunicação por item, régua e etapa; reenvio até o limite de tentativas (RN-NOVO-REG-004)"},
        {"kind": "SCHEDULED_JOB", "name": "Atualização intraciclo de regularização", "direction": "BOTH", "operationType": "NEW", "payloadSummary": "Encerra caso e régua de quem regularizou e atribui a origem", "retryAndIdempotency": "Regularização já atribuída não é recalculada"},
        {"kind": "SCHEDULED_JOB", "name": "Coleta diária do Platform Analytics", "direction": "OUTBOUND", "operationType": "NEW", "payloadSummary": "Indicadores calculados das tabelas", "retryAndIdempotency": "Coleta do dia pode ser refeita"},
        {"kind": "OTHER", "name": "Envio ao provedor de mensagens (REST Message)", "direction": "OUTBOUND", "operationType": "NEW", "payloadSummary": "Mensagem renderizada por canal", "retryAndIdempotency": "Falha volta para reenvio até o limite; id_provedor guardado na resposta"},
    ],
    "migrationsState": [],
    "openQuestions": [
        {"description": "Nome do escopo da aplicação a confirmar", "affectedEntity": "todas (prefixo x_cbi_)", "requiredInformation": "TI aprova o escopo x_cbi_ (gaps.md GAP-013)"},
        {"description": "Prazo de guarda do conteúdo original dos registros rejeitados e das comunicações", "affectedEntity": "RegistroRejeitado, Comunicacao", "requiredInformation": "Prazos do encarregado de dados (GAP-024)"},
        {"description": "Fonte do consentimento fora do IPVA", "affectedEntity": "Consentimento", "requiredInformation": "Origem do opt-in de SMS e WhatsApp para ICMS, ITCD e parcelamentos (GAP-028)"},
        {"description": "Formato e duração do ciclo da carteira", "affectedEntity": "Carteira (ciclo), Meta (ciclo)", "requiredInformation": "Ciclo mensal ou outro; regra de virada (GAP-023)"},
        {"description": "Origem da marca de contumaz", "affectedEntity": "Contribuinte (contumaz)", "requiredInformation": "CCF ou Credep (GAP-017)"},
        {"description": "Contato-chave do contribuinte não modelado", "affectedEntity": "Contribuinte", "requiredInformation": "Decisão sobre o contato-chave do protótipo (GAP-025)"},
        {"description": "StatusComunicacao ganhou FALHA_DEFINITIVA, que a ETF não lista: a regra de reenvio limitado (RN-NOVO-REG-004) e o cenário 3 de RF-MOD-REGUAS-07 precisam distinguir a falha que ainda será reenviada da que esgotou as tentativas", "affectedEntity": "Comunicacao.status", "requiredInformation": "Confirmar com a Coordenação"},
        {"description": "Listas de opções das telas do product-requirements divergiam da ETF em quatro campos; o modelo segue a ETF e as telas foram alinhadas", "affectedEntity": "Comunicacao.status, Caso.estagio, Interacao.tipo, Interacao.resultado", "requiredInformation": "Confirmar com a Coordenação os valores da ETF"},
    ],
}
out = REPO / "outputs" / "spec" / "data-model.json"
out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print("entidades:", sum(len(e) for e in contextos.values()), "colunas:", sum(len(x["columns"]) for e in contextos.values() for x in e), "FKs completadas pela §4.3:", faltas)
