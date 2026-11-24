"""Gera outputs/spec/api-contracts.yaml e api-contracts-supplement.json (spec-api-contracts).

Uso: python3 -I ac_gerar.py <raiz-do-projeto>
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml


class SemAlias(yaml.SafeDumper):
    def ignore_aliases(self, data):
        return True

RAIZ = Path(sys.argv[1])
SAIDA = RAIZ / "outputs" / "spec"
AGORA = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# ---------------------------------------------------------------- fontes
FONTES = [
    {
        "slug": "ccf", "Op": "Ccf", "nome": "Conta Corrente Fiscal (CCF)", "int": "INT-01",
        "recebe": "débitos e parcelamentos de ICMS",
        "listas": ["debitos", "parcelamentos"],
        "rfs": ["RF-MOD-INGESTAO-01", "RF-MOD-INGESTAO-02", "RF-MOD-INGESTAO-03",
                "RF-MOD-INGESTAO-04", "RF-MOD-INGESTAO-10"],
        "rns": ["RN-NOVO-ING-001", "RN-NOVO-ING-002"],
        "nota": "Maior volume; carga incremental por data de alteração (ETF §6.3).",
    },
    {
        "slug": "mpi", "Op": "Mpi", "nome": "MPI (legado em descontinuação)", "int": "INT-02",
        "recebe": "débitos de ICMS ST",
        "listas": ["debitos"],
        "rfs": ["RF-MOD-INGESTAO-01", "RF-MOD-INGESTAO-02", "RF-MOD-INGESTAO-04",
                "RF-MOD-INGESTAO-11"],
        "rns": ["RN-NOVO-ING-003"],
        "fechamentoExtra": "percentualMigracao",
        "nota": "No fechamento a fonte informa quanto das regras já migrou para o Big Data (RF-MOD-INGESTAO-11).",
    },
    {
        "slug": "bigdata", "Op": "BigData", "nome": "Big Data (P2.2)", "int": "INT-03",
        "recebe": "débitos migrados do MPI",
        "listas": ["debitos"],
        "rfs": ["RF-MOD-INGESTAO-01", "RF-MOD-INGESTAO-02", "RF-MOD-INGESTAO-04",
                "RF-MOD-INGESTAO-11"],
        "rns": ["RN-NOVO-ING-003"],
        "nota": "Débito que já veio pelo MPI com a mesma chave natural conta uma vez só (RN-NOVO-ING-003).",
    },
    {
        "slug": "ipva", "Op": "Ipva", "nome": "Sistema IPVA", "int": "INT-04",
        "recebe": "débitos de IPVA",
        "listas": ["debitos"],
        "rfs": ["RF-MOD-INGESTAO-01", "RF-MOD-INGESTAO-02", "RF-MOD-INGESTAO-04"],
        "rns": [],
        "nota": "Volume alto; maioria de pessoa física.",
    },
    {
        "slug": "itcd", "Op": "Itcd", "nome": "GIA-ITCD", "int": "INT-05",
        "recebe": "débitos de ITCD",
        "listas": ["debitos"],
        "rfs": ["RF-MOD-INGESTAO-01", "RF-MOD-INGESTAO-02", "RF-MOD-INGESTAO-04"],
        "rns": [],
        "nota": "Menor volume; o ITCD não tem score.",
    },
    {
        "slug": "sne", "Op": "Sne", "nome": "SNE / DT-e", "int": "INT-06",
        "recebe": "débitos e sinalizações de cobrança coercitiva",
        "listas": ["debitos", "sinalizacoes"],
        "rfs": ["RF-MOD-INGESTAO-01", "RF-MOD-INGESTAO-02", "RF-MOD-INGESTAO-04",
                "RF-MOD-INGESTAO-12"],
        "rns": ["RN-NOVO-ING-007"],
        "nota": "A sinalização é só informativa: aparece no dossiê, sem ação disponível (RN-NOVO-ING-007).",
    },
    {
        "slug": "score", "Op": "Score", "nome": "UFMT (modelo de score)", "int": "INT-07",
        "recebe": "o score de liquidez por contribuinte",
        "listas": ["scores"],
        "rfs": ["RF-MOD-SCORE-01", "RF-MOD-SCORE-03", "RF-MOD-INGESTAO-04"],
        "rns": [],
        "fechamentoExtra": "versaoModelo",
        "nota": "Cada lote traz a versão do modelo; ao fechar, o score de cada contribuinte encontrado vira o vigente (RF-MOD-SCORE-01).",
    },
]
RNS_COMUNS = ["RN-NOVO-ING-004", "RN-NOVO-ING-005", "RN-NOVO-ING-006", "RN-NOVO-ING-008"]

REF = lambda n: {"$ref": f"#/components/schemas/{n}"}  # noqa: E731
RESP = lambda n: {"$ref": f"#/components/responses/{n}"}  # noqa: E731
PARAM = lambda n: {"$ref": f"#/components/parameters/{n}"}  # noqa: E731

LISTA_SCHEMA = {
    "debitos": ("RegistroDebito", "Débitos do pacote."),
    "parcelamentos": ("RegistroParcelamento", "Parcelamentos do pacote."),
    "sinalizacoes": ("RegistroSinalizacao", "Sinalizações de cobrança coercitiva do pacote."),
    "scores": ("RegistroScore", "Scores do pacote, um por contribuinte."),
}

# ---------------------------------------------------------------- catálogo de erros
ERROS = {
    "CORPO_INVALIDO": (400, "Corpo da requisição inválido",
                       "O corpo não é um JSON válido, falta campo obrigatório da requisição ou um campo está fora do formato. O campo com problema vem em «campo».", None),
    "NAO_AUTENTICADO": (401, "Não autenticado",
                        "O token OAuth está ausente, vencido ou inválido. Peça um token novo e repita a chamada.", None),
    "ACESSO_NEGADO": (403, "Acesso negado a este endpoint",
                      "O usuário de integração não tem permissão neste endpoint: cada fonte só envia pela própria API. Nada foi gravado.", "RN-NOVO-ING-008"),
    "LOTE_NAO_ENCONTRADO": (404, "Lote não encontrado",
                            "Não existe lote aberto com este identificador para esta fonte. Abra o lote antes de enviar pacotes.", None),
    "LOTE_JA_FECHADO": (409, "Lote já fechado",
                        "O lote já foi fechado. Um lote fechado não recebe pacotes nem pode ser reaberto; para corrigir dados, envie um lote novo.", "RN-NOVO-ING-005"),
    "FECHAMENTO_DIVERGENTE": (409, "Lote fechado com outro total de pacotes",
                              "O lote já foi fechado informando outra quantidade de pacotes. O primeiro fechamento vale.", "RN-NOVO-ING-005"),
    "PACOTE_DIVERGENTE": (409, "Pacote já recebido com outro conteúdo",
                          "Este número de pacote já foi gravado com conteúdo diferente. Reenvio só vale com o mesmo conteúdo; para mudar dados, use o próximo número de pacote.", "RN-NOVO-ING-005"),
    "PACOTE_GRANDE_DEMAIS": (413, "Pacote acima do tamanho máximo",
                             "O pacote passou do número máximo de registros por pacote. Divida em pacotes menores; o lote continua aberto e nada deste pacote foi gravado.", None),
    "SEQUENCIA_INVALIDA": (422, "Pacote fora de sequência",
                           "O número do pacote não é o esperado para este lote. A sequência esperada vem em «sequenciaEsperada»; nada deste pacote foi gravado.", "RN-NOVO-ING-005"),
    "PACOTES_FALTANTES": (422, "Faltam pacotes para fechar o lote",
                          "A quantidade de pacotes informada no fechamento não bate com os pacotes recebidos. Os números que faltam vêm em «pacotesFaltantes»; o lote continua aberto para o reenvio.", "RN-NOVO-ING-006"),
    "COMUNICACAO_NAO_ENCONTRADA": (404, "Comunicação não encontrada",
                                   "Não existe comunicação com este identificador do provedor. O sistema recusa o status e registra o evento para análise.", None),
    "LIMITE_EXCEDIDO": (429, "Limite de requisições excedido",
                        "O usuário de integração passou do limite de requisições. Espere o tempo de «Retry-After» e repita; nada desta requisição foi gravado.", None),
    "ERRO_INTERNO": (500, "Erro interno",
                     "Erro inesperado ao processar a requisição. Nada desta requisição foi gravado; repita mais tarde. O detalhe técnico fica só no log interno, ligado ao identificador do lote.", None),
}


def problem_resp(codigos, descricao):
    exemplos = {}
    for c in codigos:
        st, titulo, detalhe, rn = ERROS[c]
        ex = {"type": f"urn:x_cbi:erro:{c.lower().replace('_', '-')}", "title": titulo,
              "status": st, "detail": detalhe, "codigo": c}
        if rn:
            ex["x-rn-violada"] = rn
        if c == "SEQUENCIA_INVALIDA":
            ex["sequenciaEsperada"] = 3
        if c == "PACOTES_FALTANTES":
            ex["pacotesFaltantes"] = [2]
        if c == "CORPO_INVALIDO":
            ex["campo"] = "idLoteOrigem"
        exemplos[c] = {"summary": titulo, "value": ex}
    return {"description": descricao,
            "content": {"application/problem+json": {"schema": REF("Problem"), "examples": exemplos}}}


def resp_429():
    r = problem_resp(["LIMITE_EXCEDIDO"],
                     "O usuário de integração passou do limite de requisições; espere o tempo indicado e repita.")
    r["headers"] = {"Retry-After": {"description": "Segundos a esperar antes de repetir a chamada.",
                                    "schema": {"type": "integer", "minimum": 1}}}
    return r


# ---------------------------------------------------------------- schemas
DOC = {"type": "string", "pattern": "^([0-9]{11}|[0-9]{14})$", "maxLength": 14,
       "description": "CPF (11 dígitos) ou CNPJ (14 dígitos), só números. Documento com dígito verificador inválido é rejeitado com DOC_INVALIDO (RN-NOVO-ING-004).",
       "example": "52998224725"}
ID_ORIGEM = {"type": "string", "minLength": 1, "maxLength": 40,
             "description": "Identificador do registro no sistema de origem. É a chave natural: o mesmo identificador da mesma fonte atualiza o registro, nunca duplica (RN-NOVO-ING-005).",
             "example": "CCF-2026-000123"}

SCHEMAS = {
    "Problem": {
        "type": "object",
        "description": "Erro da requisição inteira no formato RFC 7807 (Problem Details — o padrão de erro em JSON da IETF), com mensagem em português e sem detalhe interno (SEC-016).",
        "required": ["type", "title", "status", "codigo"],
        "properties": {
            "type": {"type": "string", "format": "uri", "description": "Identificador do tipo do erro.",
                     "example": "urn:x_cbi:erro:lote-nao-encontrado"},
            "title": {"type": "string", "description": "Resumo curto do erro, em português.", "example": "Lote não encontrado"},
            "status": {"type": "integer", "description": "Código HTTP repetido no corpo.", "example": 404},
            "detail": {"type": "string", "description": "O que aconteceu nesta chamada e o que fazer, em português.",
                       "example": "Não existe lote aberto com este identificador para esta fonte."},
            "instance": {"type": "string", "description": "Caminho da requisição que falhou.",
                         "example": "/ingestao/ccf/lotes/LOTE-20261113-01/pacotes/1"},
            "codigo": {"type": "string", "enum": list(ERROS.keys()),
                       "description": "Código tipado do erro — lista fechada; o parceiro decide o que fazer por este código, nunca pelo texto.", "example": "LOTE_NAO_ENCONTRADO"},
            "x-rn-violada": {"type": "string", "description": "Regra de negócio violada, quando houver.", "example": "RN-NOVO-ING-005"},
            "campo": {"type": "string", "description": "Campo com problema, quando o erro é de um campo.", "example": "idLoteOrigem"},
            "sequenciaEsperada": {"type": "integer", "description": "Número do próximo pacote esperado (só em SEQUENCIA_INVALIDA).", "example": 3},
            "pacotesFaltantes": {"type": "array", "items": {"type": "integer"}, "maxItems": 1000,
                                 "description": "Números dos pacotes que não chegaram (só em PACOTES_FALTANTES).", "example": [2]},
        },
    },
    "AberturaLote": {
        "type": "object",
        "description": "Dados para abrir um lote. O identificador do lote na origem é a chave: abrir de novo o mesmo lote devolve o lote já aberto, sem criar outro.",
        "additionalProperties": False,
        "required": ["idLoteOrigem", "dataReferencia"],
        "properties": {
            "idLoteOrigem": {"type": "string", "minLength": 1, "maxLength": 60, "pattern": "^[A-Za-z0-9._-]+$",
                             "description": "Identificador do lote no sistema de origem. Letras, números, ponto, hífen e sublinhado.",
                             "example": "LOTE-20261113-01"},
            "dataReferencia": {"type": "string", "format": "date",
                               "description": "Dia de referência dos dados do lote.", "example": "2026-11-13"},
            "pacotesPrevistos": {"type": "integer", "minimum": 1, "maximum": 100000,
                                 "description": "Quantos pacotes a fonte pretende enviar, se já souber. Serve para recusar pacote fora da faixa logo na chegada.",
                                 "example": 3},
        },
    },
    "AberturaLoteScore": {
        "allOf": [REF("AberturaLote"), {
            "type": "object",
            "properties": {"versaoModelo": {"type": "string", "maxLength": 20,
                                            "description": "Versão do modelo de score usada no lote. Pode vir na abertura ou no fechamento; sem ela o lote não fecha (RF-MOD-SCORE-01).",
                                            "example": "2.1"}}}],
        "description": "Abertura do lote de score: igual à das outras fontes, mais a versão do modelo.",
        "example": {"idLoteOrigem": "SCORE-20261113-01", "dataReferencia": "2026-11-13", "pacotesPrevistos": 3, "versaoModelo": "2.1"},
    },
    "Lote": {
        "type": "object",
        "description": "Situação de um lote: quantos pacotes chegaram e quantos registros foram aceitos ou rejeitados até agora.",
        "required": ["idLoteOrigem", "fonte", "situacao", "pacotesRecebidos", "lidos", "aceitos", "rejeitados", "inicio"],
        "properties": {
            "idLoteOrigem": {"type": "string", "maxLength": 60, "example": "LOTE-20261113-01"},
            "fonte": {"type": "string", "maxLength": 20, "description": "Código da fonte dona do lote.", "example": "ccf"},
            "situacao": {"type": "string", "enum": ["EM_ANDAMENTO", "OK", "PARCIAL", "FALHA"],
                         "description": "EM_ANDAMENTO: aberto, recebendo pacotes. OK: fechado sem rejeição. PARCIAL: fechado com registros rejeitados. FALHA: não fechou até o prazo da fonte (o fechamento do ciclo marca).",
                         "example": "EM_ANDAMENTO"},
            "pacotesPrevistos": {"type": "integer", "nullable": True, "example": 3},
            "pacotesRecebidos": {"type": "integer", "example": 0},
            "lidos": {"type": "integer", "description": "Registros recebidos em todos os pacotes.", "example": 0},
            "aceitos": {"type": "integer", "example": 0},
            "rejeitados": {"type": "integer", "example": 0},
            "inicio": {"type": "string", "format": "date-time", "example": "2026-11-13T02:00:00-04:00"},
            "fim": {"type": "string", "format": "date-time", "nullable": True, "example": None},
        },
    },
    "RegistroDebito": {
        "type": "object",
        "description": "Um débito enviado pela fonte. O mesmo idOrigem da mesma fonte atualiza o débito (por exemplo, valor novo ou regularização), nunca cria outro.",
        "additionalProperties": False,
        "required": ["idOrigem", "documento", "nome", "tributo", "valor", "vencimento", "situacao"],
        "properties": {
            "idOrigem": ID_ORIGEM,
            "documento": DOC,
            "nome": {"type": "string", "minLength": 1, "maxLength": 150, "description": "Nome ou razão social do contribuinte.", "example": "Contribuinte Sintético da Silva"},
            "tributo": {"type": "string", "enum": ["ICMS_NORMAL", "ICMS_ST", "IPVA", "ITCD"], "description": "Tributo do débito.", "example": "ICMS_NORMAL"},
            "valor": {"type": "number", "format": "double", "exclusiveMinimum": True, "minimum": 0, "maximum": 999999999999.99,
                      "description": "Valor em aberto, em reais.", "example": 1520.75},
            "vencimento": {"type": "string", "format": "date", "example": "2026-09-10"},
            "instrumento": {"type": "string", "enum": ["AUTO_INFRACAO", "DECLARACAO", "OUTRO"], "description": "Como o débito foi constituído.", "example": "DECLARACAO"},
            "situacao": {"type": "string", "enum": ["EM_ABERTO", "PARCELADO", "REGULARIZADO"],
                         "description": "Situação do débito na origem. REGULARIZADO encerra a abordagem no ciclo (RN-NOVO-ING-002).", "example": "EM_ABERTO"},
            "dataRegularizacao": {"type": "string", "format": "date", "description": "Obrigatória quando a situação é REGULARIZADO.", "example": "2026-11-12"},
            "contumaz": {"type": "boolean", "description": "Marca de devedor contumaz vinda da fonte (usada na exclusão da carteira enquanto o Credep não é integrado).", "example": False},
            "dataAlteracao": {"type": "string", "format": "date-time", "description": "Quando o débito mudou na origem (carga incremental da CCF).", "example": "2026-11-12T18:40:00-04:00"},
        },
    },
    "RegistroParcelamento": {
        "type": "object",
        "description": "Um parcelamento enviado pela CCF. O número de parcelas em atraso alimenta o alerta de parcelamento em risco (RF-MOD-INGESTAO-10).",
        "additionalProperties": False,
        "required": ["idOrigem", "numero", "documento", "tributo", "parcelasTotal", "valor", "situacao"],
        "properties": {
            "idOrigem": ID_ORIGEM,
            "numero": {"type": "string", "maxLength": 20, "description": "Número do parcelamento na origem.", "example": "PAR-2026-00042"},
            "documento": DOC,
            "tributo": {"type": "string", "enum": ["ICMS_NORMAL", "ICMS_ST", "IPVA", "ITCD"], "example": "ICMS_NORMAL"},
            "parcelasTotal": {"type": "integer", "minimum": 1, "maximum": 999, "example": 24},
            "parcelasPagas": {"type": "integer", "minimum": 0, "maximum": 999, "example": 10},
            "parcelasEmAtraso": {"type": "integer", "minimum": 0, "maximum": 999, "example": 2},
            "valor": {"type": "number", "format": "double", "exclusiveMinimum": True, "minimum": 0, "maximum": 999999999999.99, "example": 48000.0},
            "situacao": {"type": "string", "enum": ["ATIVO", "EM_RISCO", "ENCERRADO"], "example": "EM_RISCO"},
        },
    },
    "RegistroSinalizacao": {
        "type": "object",
        "description": "Uma sinalização de cobrança coercitiva (protesto, notificação) enviada pela SNE. É só informativa: o produto mostra no dossiê e não oferece ação sobre ela (RN-NOVO-ING-007).",
        "additionalProperties": False,
        "required": ["idOrigem", "documento", "tipo", "data", "ativa"],
        "properties": {
            "idOrigem": ID_ORIGEM,
            "documento": DOC,
            "idDebitoOrigem": {"type": "string", "maxLength": 40, "description": "Débito a que a sinalização se refere, quando houver.", "example": "SNE-DEB-778"},
            "tipo": {"type": "string", "enum": ["PROTESTO_PGE", "NOTIFICACAO_COERCITIVA", "OUTRO"], "example": "PROTESTO_PGE"},
            "data": {"type": "string", "format": "date", "example": "2026-10-30"},
            "ativa": {"type": "boolean", "description": "false quando a fonte encerra a sinalização; ela passa para o histórico.", "example": True},
            "descricao": {"type": "string", "maxLength": 300, "example": "Protesto enviado pela PGE"},
        },
    },
    "RegistroScore": {
        "type": "object",
        "description": "O score de liquidez de um contribuinte. Documento sem contribuinte na base é rejeitado com CONTRIB_NAO_ENCONTRADO.",
        "additionalProperties": False,
        "required": ["documento", "valor"],
        "properties": {
            "documento": DOC,
            "valor": {"type": "number", "format": "double", "minimum": 0, "maximum": 1,
                      "description": "Valor do score, de 0 a 1, como as faixas do produto (RN-NOVO-SCO-002).", "example": 0.71},
        },
    },
    "ResultadoRegistro": {
        "type": "object",
        "description": "O que aconteceu com um registro do pacote: aceito, ou rejeitado com o motivo da lista fechada (RN-NOVO-ING-004).",
        "required": ["chaveOrigem", "situacao"],
        "properties": {
            "chaveOrigem": {"type": "string", "maxLength": 60, "description": "idOrigem do registro (ou o documento, no score).", "example": "CCF-2026-000124"},
            "lista": {"type": "string", "enum": ["debitos", "parcelamentos", "sinalizacoes", "scores"], "example": "debitos"},
            "situacao": {"type": "string", "enum": ["ACEITO", "REJEITADO"], "example": "REJEITADO"},
            "motivo": {"type": "string", "enum": ["DOC_INVALIDO", "CAMPO_AUSENTE", "CONTRIB_NAO_ENCONTRADO", "FORMATO_INVALIDO", "OUTRO"],
                       "description": "Só quando REJEITADO.", "example": "DOC_INVALIDO"},
            "detalhe": {"type": "string", "maxLength": 300, "description": "Explicação curta em português, sem dado pessoal.", "example": "Dígito verificador do CPF não confere."},
        },
    },
    "ResultadoPacote": {
        "type": "object",
        "description": "Resposta a um pacote: contagem e o resultado de cada registro. Reenviar o mesmo pacote devolve esta mesma resposta, sem gravar de novo.",
        "required": ["idLoteOrigem", "sequencia", "recebidos", "aceitos", "rejeitados", "resultados"],
        "properties": {
            "idLoteOrigem": {"type": "string", "maxLength": 60, "example": "LOTE-20261113-01"},
            "sequencia": {"type": "integer", "example": 1},
            "reenvio": {"type": "boolean", "description": "true quando este pacote já tinha sido recebido e nada foi gravado de novo.", "example": False},
            "recebidos": {"type": "integer", "example": 2},
            "aceitos": {"type": "integer", "example": 1},
            "rejeitados": {"type": "integer", "example": 1},
            "resultados": {"type": "array", "maxItems": 1000, "items": REF("ResultadoRegistro"), "example": [{"chaveOrigem": "CCF-2026-000124", "lista": "debitos", "situacao": "REJEITADO", "motivo": "DOC_INVALIDO", "detalhe": "Dígito verificador do CPF não confere."}]},
        },
    },
    "FechamentoLote": {
        "type": "object",
        "description": "Fechamento do lote: a fonte informa quantos pacotes enviou.",
        "additionalProperties": False,
        "required": ["pacotesEnviados"],
        "properties": {"pacotesEnviados": {"type": "integer", "minimum": 0, "maximum": 100000,
                                           "description": "Total de pacotes enviados no lote. Zero vale para dia sem dados.", "example": 3}},
    },
    "FechamentoLoteMpi": {
        "type": "object",
        "description": "Fechamento do lote do MPI: além do total de pacotes, o percentual de regras já migradas para o Big Data.",
        "additionalProperties": False,
        "required": ["pacotesEnviados"],
        "properties": {
            "pacotesEnviados": {"type": "integer", "minimum": 0, "maximum": 100000, "example": 3},
            "percentualMigracao": {"type": "number", "minimum": 0, "maximum": 100,
                                   "description": "Percentual das regras do MPI já migradas para o Big Data; aparece na fonte MPI (RF-MOD-INGESTAO-11).", "example": 60},
        },
    },
    "FechamentoLoteScore": {
        "type": "object",
        "description": "Fechamento do lote de score: a versão do modelo é obrigatória se não veio na abertura. Sem ela o sistema recusa o fechamento e informa o campo.",
        "additionalProperties": False,
        "required": ["pacotesEnviados"],
        "properties": {
            "pacotesEnviados": {"type": "integer", "minimum": 0, "maximum": 100000, "example": 3},
            "versaoModelo": {"type": "string", "maxLength": 20, "example": "2.1"},
        },
    },
    "EventoEntrega": {
        "type": "object",
        "description": "Status de entrega informado pelo provedor de mensagens para uma comunicação já enviada.",
        "additionalProperties": False,
        "required": ["idProvedor", "situacao", "dataEvento"],
        "properties": {
            "idProvedor": {"type": "string", "minLength": 1, "maxLength": 60, "description": "Identificador que o provedor devolveu no envio.", "example": "msg-8f3a2c"},
            "canal": {"type": "string", "enum": ["EMAIL", "SMS", "WHATSAPP"], "example": "SMS"},
            "situacao": {"type": "string", "enum": ["ENTREGUE", "LIDO", "FALHA"], "example": "ENTREGUE"},
            "dataEvento": {"type": "string", "format": "date-time", "example": "2026-11-13T09:15:00-04:00"},
            "detalhe": {"type": "string", "maxLength": 300, "description": "Motivo da falha, quando houver, sem dado pessoal.", "example": "Número inexistente"},
        },
    },
    "ResultadoEventoEntrega": {
        "type": "object",
        "description": "Resposta ao status: a situação atual da comunicação e se ela mudou. Status repetido ou mais antigo que o atual não muda nada.",
        "required": ["idProvedor", "situacaoAtual", "alterado"],
        "properties": {
            "idProvedor": {"type": "string", "maxLength": 60, "example": "msg-8f3a2c"},
            "situacaoAtual": {"type": "string", "enum": ["ENVIADO", "ENTREGUE", "LIDO", "FALHA", "FALHA_DEFINITIVA"], "example": "ENTREGUE"},
            "alterado": {"type": "boolean", "example": True},
        },
    },
}


def pacote_schema(f):
    props = {}
    for lst in f["listas"]:
        nome, desc = LISTA_SCHEMA[lst]
        props[lst] = {"type": "array", "maxItems": 1000, "items": REF(nome), "description": desc, "example": exemplo_pacote(f).get(lst, [])}
    return {
        "type": "object",
        "description": f"Pacote de registros da fonte {f['nome']}: {f['recebe']}. Até 1.000 registros por pacote, somando as listas.",
        "additionalProperties": False,
        "minProperties": 1,
        "properties": props,
    }



EX_DEB_OK = {"idOrigem": "CCF-2026-000123", "documento": "11222333000181", "nome": "Empresa Sintética Ltda",
             "tributo": "ICMS_NORMAL", "valor": 1520.75, "vencimento": "2026-09-10", "instrumento": "DECLARACAO",
             "situacao": "EM_ABERTO"}
EX_DEB_RUIM = {"idOrigem": "CCF-2026-000124", "documento": "52998224700", "nome": "Contribuinte Sintético",
               "tributo": "ICMS_NORMAL", "valor": 300.0, "vencimento": "2026-08-10", "situacao": "EM_ABERTO"}


def exemplo_pacote(f):
    if f["slug"] == "score":
        return {"scores": [{"documento": "52998224725", "valor": 0.71}, {"documento": "11144477735", "valor": 0.43}]}
    tributo = {"ccf": "ICMS_NORMAL", "mpi": "ICMS_ST", "bigdata": "ICMS_ST", "ipva": "IPVA", "itcd": "ITCD", "sne": "ICMS_NORMAL"}[f["slug"]]
    a = dict(EX_DEB_OK, tributo=tributo, idOrigem=f"{f['slug'].upper()}-2026-000123")
    b = dict(EX_DEB_RUIM, tributo=tributo, idOrigem=f"{f['slug'].upper()}-2026-000124")
    ex = {"debitos": [a, b]}
    if "parcelamentos" in f["listas"]:
        ex["parcelamentos"] = [{"idOrigem": "CCF-PAR-0042", "numero": "PAR-2026-00042", "documento": "11222333000181",
                                "tributo": "ICMS_NORMAL", "parcelasTotal": 24, "parcelasPagas": 10,
                                "parcelasEmAtraso": 2, "valor": 48000.0, "situacao": "EM_RISCO"}]
    if "sinalizacoes" in f["listas"]:
        ex["sinalizacoes"] = [{"idOrigem": "SNE-SIN-0007", "documento": "11222333000181", "tipo": "PROTESTO_PGE",
                               "data": "2026-10-30", "ativa": True, "descricao": "Protesto enviado pela PGE"}]
    return ex


def exemplo_resultado(f):
    if f["slug"] == "score":
        return {"idLoteOrigem": "SCORE-20261113-01", "sequencia": 1, "reenvio": False, "recebidos": 2, "aceitos": 1, "rejeitados": 1,
                "resultados": [{"chaveOrigem": "52998224725", "lista": "scores", "situacao": "ACEITO"},
                               {"chaveOrigem": "11144477735", "lista": "scores", "situacao": "REJEITADO",
                                "motivo": "CONTRIB_NAO_ENCONTRADO", "detalhe": "Não há contribuinte na base com este documento."}]}
    return {"idLoteOrigem": "LOTE-20261113-01", "sequencia": 1, "reenvio": False, "recebidos": 2, "aceitos": 1, "rejeitados": 1,
            "resultados": [{"chaveOrigem": f"{f['slug'].upper()}-2026-000123", "lista": "debitos", "situacao": "ACEITO"},
                           {"chaveOrigem": f"{f['slug'].upper()}-2026-000124", "lista": "debitos", "situacao": "REJEITADO",
                            "motivo": "DOC_INVALIDO", "detalhe": "Dígito verificador do CPF não confere."}]}


for f in FONTES:
    SCHEMAS[f"Pacote{f['Op']}"] = pacote_schema(f)

# abertura do score: schema próprio (allOf com additionalProperties=false recusaria versaoModelo)
_ab = SCHEMAS["AberturaLote"]
SCHEMAS["AberturaLoteScore"] = {
    "type": "object",
    "description": "Abertura do lote de score: igual à das outras fontes, mais a versão do modelo.",
    "additionalProperties": False,
    "required": list(_ab["required"]),
    "properties": dict(_ab["properties"], versaoModelo={"type": "string", "maxLength": 20,
        "description": "Versão do modelo de score usada no lote. Pode vir na abertura ou no fechamento; sem ela o lote não fecha (RF-MOD-SCORE-01).",
        "example": "2.1"}),
}

# ---------------------------------------------------------------- operações
paths = {}
supl_ops = []
ESCOPO = lambda f: f"ingestao.{f['slug']}"  # noqa: E731


def seguranca(escopo):
    return [{"OAuthFonte": [escopo]}]


for f in FONTES:
    base = f"/ingestao/{f['slug']}/lotes"
    tag = f"Ingestão — {f['nome']}"
    rfs = f["rfs"]
    rns = RNS_COMUNS + f["rns"]
    abertura_schema = "AberturaLoteScore" if f["slug"] == "score" else "AberturaLote"
    fech_schema = {"mpi": "FechamentoLoteMpi", "score": "FechamentoLoteScore"}.get(f["slug"], "FechamentoLote")
    id_lote_ex = "SCORE-20261113-01" if f["slug"] == "score" else "LOTE-20261113-01"
    lote_ex = {"idLoteOrigem": id_lote_ex, "fonte": f["slug"], "situacao": "EM_ANDAMENTO", "pacotesPrevistos": 3,
               "pacotesRecebidos": 0, "lidos": 0, "aceitos": 0, "rejeitados": 0, "inicio": "2026-11-13T02:00:00-04:00", "fim": None}
    abertura_ex = {"idLoteOrigem": id_lote_ex, "dataReferencia": "2026-11-13", "pacotesPrevistos": 3}
    if f["slug"] == "score":
        abertura_ex["versaoModelo"] = "2.1"

    op_abrir = f"abrirLote{f['Op']}"
    op_pacote = f"enviarPacote{f['Op']}"
    op_fechar = f"fecharLote{f['Op']}"

    paths[base] = {"post": {
        "operationId": op_abrir,
        "tags": [tag],
        "summary": f"Abrir um lote de carga da fonte {f['nome']}",
        "description": (
            f"Abre um lote para a fonte {f['nome']} enviar {f['recebe']} e devolve o lote criado. "
            "Se o mesmo identificador de lote já estiver aberto, devolve o lote existente (200) sem criar outro; "
            "se já estiver fechado, recusa com 409. "
            f"{f['nota']} Integração {f['int']}."),
        "security": seguranca(ESCOPO(f)),
        "requestBody": {"required": True, "description": "Corpo em JSON conforme o schema abaixo; campos fora do contrato são recusados.", "content": {"application/json": {
            "schema": REF(abertura_schema), "examples": {"abertura": {"summary": "Abertura do lote do dia", "value": abertura_ex}}}}},
        "responses": {
            "201": {"description": "Lote aberto. O cabeçalho Location aponta para o lote.",
                    "headers": {"Location": {"description": "Caminho do lote criado.", "schema": {"type": "string"}}},
                    "content": {"application/json": {"schema": REF("Lote"), "examples": {"criado": {"summary": "Lote novo", "value": lote_ex}}}}},
            "200": {"description": "O lote com este identificador já estava aberto; nada foi criado e o lote existente volta na resposta.",
                    "content": {"application/json": {"schema": REF("Lote")}}},
            "400": problem_resp(["CORPO_INVALIDO"], "Corpo inválido: falta campo obrigatório ou um campo está fora do formato."),
            "401": problem_resp(["NAO_AUTENTICADO"], "Token ausente, vencido ou inválido."),
            "403": problem_resp(["ACESSO_NEGADO"], "O usuário de integração não pertence a esta fonte; nada foi gravado."),
            "409": problem_resp(["LOTE_JA_FECHADO"], "O lote com este identificador já foi fechado e não pode ser reaberto."),
            "429": resp_429(),
            "500": problem_resp(["ERRO_INTERNO"], "Erro inesperado; nada foi gravado."),
        },
    }}
    paths[f"{base}/{{idLoteOrigem}}/pacotes/{{sequencia}}"] = {"put": {
        "operationId": op_pacote,
        "tags": [tag],
        "summary": f"Enviar um pacote de registros do lote da fonte {f['nome']}",
        "description": (
            f"Grava um pacote numerado de {f['recebe']} no lote e devolve, para cada registro, se foi aceito ou rejeitado com o motivo. "
            "Registro com erro não derruba o pacote: a resposta é 200 e o registro rejeitado vai para a lista de rejeitados, com o conteúdo original, para reprocesso (RN-NOVO-ING-004). "
            "Reenviar o mesmo número de pacote com o mesmo conteúdo devolve a mesma resposta e não grava nada de novo (RN-NOVO-ING-005). "
            "Pacote fora da sequência é recusado com 422 e a sequência esperada."),
        "security": seguranca(ESCOPO(f)),
        "parameters": [PARAM("IdLoteOrigem"), PARAM("Sequencia")],
        "requestBody": {"required": True, "description": "Corpo em JSON conforme o schema abaixo; campos fora do contrato são recusados.", "content": {"application/json": {
            "schema": REF(f"Pacote{f['Op']}"), "examples": {"pacote": {"summary": "Pacote com um registro válido e um inválido", "value": exemplo_pacote(f)}}}}},
        "responses": {
            "200": {"description": "Pacote processado. Cada registro vem como aceito ou rejeitado com o motivo; em reenvio, «reenvio» vem true e nada foi gravado de novo.",
                    "content": {"application/json": {"schema": REF("ResultadoPacote"), "examples": {"resultado": {"summary": "Um aceito e um rejeitado", "value": exemplo_resultado(f)}}}}},
            "400": problem_resp(["CORPO_INVALIDO"], "O corpo não é um pacote válido (JSON malformado, lista vazia ou lista que esta fonte não envia)."),
            "401": problem_resp(["NAO_AUTENTICADO"], "Token ausente, vencido ou inválido."),
            "403": problem_resp(["ACESSO_NEGADO"], "O usuário de integração não pertence a esta fonte; nada foi gravado."),
            "404": problem_resp(["LOTE_NAO_ENCONTRADO"], "Não há lote aberto com este identificador para esta fonte."),
            "409": problem_resp(["LOTE_JA_FECHADO", "PACOTE_DIVERGENTE"], "O lote já foi fechado, ou este número de pacote já foi gravado com outro conteúdo."),
            "413": problem_resp(["PACOTE_GRANDE_DEMAIS"], "O pacote tem mais registros do que o máximo permitido; nada dele foi gravado."),
            "422": problem_resp(["SEQUENCIA_INVALIDA"], "O número do pacote não é o esperado; a resposta informa a sequência esperada."),
            "429": resp_429(),
            "500": problem_resp(["ERRO_INTERNO"], "Erro inesperado; nada deste pacote foi gravado."),
        },
    }}
    fech_desc = (
        "Fecha o lote informando quantos pacotes foram enviados e devolve o resumo final: OK quando nenhum registro foi rejeitado, PARCIAL quando houve rejeição. "
        "Fechar de novo com o mesmo total devolve o mesmo resumo. Se faltar pacote, recusa com 422 e lista os que faltam; o lote continua aberto até o prazo da fonte, quando o fechamento do ciclo o marca como FALHA e mantém a última carga válida (RN-NOVO-ING-006).")
    if f["slug"] == "score":
        fech_desc += " Sem a versão do modelo (na abertura ou aqui), recusa com 400 e informa o campo ausente; ao fechar, o score de cada contribuinte encontrado passa a ser o vigente."
    if f["slug"] == "mpi":
        fech_desc += " O percentual de migração informado passa a aparecer na fonte MPI."
    fech_ex = {"pacotesEnviados": 3}
    if f["slug"] == "mpi":
        fech_ex["percentualMigracao"] = 60
    if f["slug"] == "score":
        fech_ex["versaoModelo"] = "2.1"
    paths[f"{base}/{{idLoteOrigem}}/fechamento"] = {"put": {
        "operationId": op_fechar,
        "tags": [tag],
        "summary": f"Fechar o lote da fonte {f['nome']}",
        "description": fech_desc,
        "security": seguranca(ESCOPO(f)),
        "parameters": [PARAM("IdLoteOrigem")],
        "requestBody": {"required": True, "description": "Corpo em JSON conforme o schema abaixo; campos fora do contrato são recusados.", "content": {"application/json": {
            "schema": REF(fech_schema), "examples": {"fechamento": {"summary": "Fechamento com 3 pacotes", "value": fech_ex}}}}},
        "responses": {
            "200": {"description": "Lote fechado (ou já fechado com o mesmo total). O resumo traz a situação final e as contagens.",
                    "content": {"application/json": {"schema": REF("Lote"), "examples": {"fechado": {"summary": "Lote fechado com rejeição", "value": dict(
                        lote_ex, situacao="PARCIAL", pacotesRecebidos=3, lidos=2900, aceitos=2898, rejeitados=2, fim="2026-11-13T02:40:00-04:00")}}}}},
            "400": problem_resp(["CORPO_INVALIDO"], "Corpo inválido ou campo obrigatório ausente (no score, a versão do modelo)."),
            "401": problem_resp(["NAO_AUTENTICADO"], "Token ausente, vencido ou inválido."),
            "403": problem_resp(["ACESSO_NEGADO"], "O usuário de integração não pertence a esta fonte; nada foi gravado."),
            "404": problem_resp(["LOTE_NAO_ENCONTRADO"], "Não há lote com este identificador para esta fonte."),
            "409": problem_resp(["FECHAMENTO_DIVERGENTE"], "O lote já foi fechado informando outro total de pacotes; vale o primeiro fechamento."),
            "422": problem_resp(["PACOTES_FALTANTES"], "O total informado não bate com os pacotes recebidos; a resposta lista os que faltam."),
            "429": resp_429(),
            "500": problem_resp(["ERRO_INTERNO"], "Erro inesperado; o lote continua aberto."),
        },
    }}

    rate = {"rateLimit": "Limite por usuário de integração desta fonte, configurável no parâmetro de integração; valor numérico a definir (SEC-005)",
            "headers": ["Retry-After"], "exceededStatus": 429}
    abertos = [q for q in []]
    supl_ops += [
        {"operationId": op_abrir, "method": "POST", "path": base, "integracao": f["int"],
         "httpSemantics": [
             {"status": 201, "meaning": "Lote novo aberto; Location aponta para ele."},
             {"status": 200, "meaning": "Lote com o mesmo idLoteOrigem já estava aberto: devolve o existente, nada é criado (repetição segura)."},
             {"status": 400, "meaning": "Falta idLoteOrigem ou dataReferencia, ou campo fora do formato; o campo vem em «campo»."},
             {"status": 401, "meaning": "Token OAuth ausente, vencido ou inválido."},
             {"status": 403, "meaning": "Usuário de integração de outra fonte (cada fonte só usa a própria API — SEC-001)."},
             {"status": 409, "meaning": "Lote com este idLoteOrigem já fechado; não reabre (RN-NOVO-ING-005)."},
             {"status": 429, "meaning": "Limite de requisições do usuário de integração excedido; repetir após Retry-After."},
             {"status": 500, "meaning": "Erro inesperado; nada gravado; detalhe só no log interno com o identificador do lote."}],
         "idempotency": {"supported": True, "keyHeader": None, "naturalKey": "fonte + idLoteOrigem",
                         "keyFormat": "idLoteOrigem definido pela fonte (até 60 caracteres)",
                         "storageTtlSeconds": None,
                         "behavior": "A chave natural fonte + idLoteOrigem substitui o cabeçalho Idempotency-Key: abrir de novo um lote aberto devolve 200 com o lote existente; abrir um lote já fechado devolve 409. A chave vale para sempre (o lote fica gravado)."},
         "rateLimiting": rate,
         "linkedRequirements": rfs, "linkedBusinessRules": rns,
         "securityControls": ["SEC-001", "SEC-005", "SEC-006", "SEC-007", "SEC-016"],
         "x-open-questions": []},
        {"operationId": op_pacote, "method": "PUT", "path": f"{base}/{{idLoteOrigem}}/pacotes/{{sequencia}}", "integracao": f["int"],
         "httpSemantics": [
             {"status": 200, "meaning": "Pacote processado: cada registro aceito ou rejeitado com motivo. Erro de registro NÃO vira 4xx (conventions.mdc). Em reenvio do mesmo conteúdo, devolve a resposta original com reenvio=true."},
             {"status": 400, "meaning": "Corpo malformado, sem nenhuma lista, ou com lista que esta fonte não envia."},
             {"status": 401, "meaning": "Token OAuth ausente, vencido ou inválido."},
             {"status": 403, "meaning": "Usuário de integração de outra fonte; nada gravado (RF-MOD-INGESTAO-01, cenário 3)."},
             {"status": 404, "meaning": "Não há lote com este idLoteOrigem para esta fonte (inclui lote de outra fonte — não revela que existe)."},
             {"status": 409, "meaning": "LOTE_JA_FECHADO: lote fechado não recebe pacote. PACOTE_DIVERGENTE: mesma sequência já gravada com conteúdo diferente."},
             {"status": 413, "meaning": "Mais de 1.000 registros no pacote (somando as listas); nada gravado; o lote continua aberto."},
             {"status": 422, "meaning": "Sequência fora da ordem esperada; a resposta traz sequenciaEsperada (RF-MOD-INGESTAO-04, cenário 3)."},
             {"status": 429, "meaning": "Limite de requisições excedido; repetir após Retry-After."},
             {"status": 500, "meaning": "Erro inesperado; nada do pacote gravado (gravação do pacote é tudo ou nada)."}],
         "idempotency": {"supported": True, "keyHeader": None, "naturalKey": "fonte + idLoteOrigem + sequencia; por registro, fonte + idOrigem",
                         "keyFormat": "sequência inteira a partir de 1",
                         "storageTtlSeconds": None,
                         "behavior": "PUT é idempotente: o mesmo pacote (mesma sequência e mesmo conteúdo, comparado por hash) devolve a resposta original e não grava nada; conteúdo diferente na mesma sequência devolve 409 PACOTE_DIVERGENTE. Registro com idOrigem já gravado pela mesma fonte em outro lote é atualizado, não duplicado (RN-NOVO-ING-005)."},
         "rateLimiting": rate,
         "payloadLimits": {"maxRegistrosPorPacote": 1000, "provisorio": True},
         "perRecordResult": {"motivos": ["DOC_INVALIDO", "CAMPO_AUSENTE", "CONTRIB_NAO_ENCONTRADO", "FORMATO_INVALIDO", "OUTRO"],
                             "destino": "x_cbi_registro_rejeitado (conteúdo original guardado para reprocesso — RF-MOD-INGESTAO-08)",
                             "rnCoberta": "RN-NOVO-ING-004"},
         "linkedRequirements": rfs, "linkedBusinessRules": rns,
         "securityControls": ["SEC-001", "SEC-005", "SEC-006", "SEC-007", "SEC-016"],
         "x-open-questions": []},
        {"operationId": op_fechar, "method": "PUT", "path": f"{base}/{{idLoteOrigem}}/fechamento", "integracao": f["int"],
         "httpSemantics": [
             {"status": 200, "meaning": "Lote fechado: OK sem rejeição, PARCIAL com rejeição. Repetir com o mesmo total devolve o mesmo resumo."},
             {"status": 400, "meaning": "Corpo inválido ou campo obrigatório ausente" + (" — no score, versaoModelo ausente na abertura e no fechamento (RF-MOD-SCORE-01, cenário 3)." if f["slug"] == "score" else ".")},
             {"status": 401, "meaning": "Token OAuth ausente, vencido ou inválido."},
             {"status": 403, "meaning": "Usuário de integração de outra fonte."},
             {"status": 404, "meaning": "Não há lote com este idLoteOrigem para esta fonte."},
             {"status": 409, "meaning": "Lote já fechado com outro total de pacotes; vale o primeiro fechamento."},
             {"status": 422, "meaning": "Total informado diferente dos pacotes recebidos; lista pacotesFaltantes; lote continua EM_ANDAMENTO até o prazo da fonte."},
             {"status": 429, "meaning": "Limite de requisições excedido; repetir após Retry-After."},
             {"status": 500, "meaning": "Erro inesperado; lote continua aberto."}],
         "idempotency": {"supported": True, "keyHeader": None, "naturalKey": "fonte + idLoteOrigem",
                         "keyFormat": "—", "storageTtlSeconds": None,
                         "behavior": "PUT idempotente: fechar de novo com o mesmo pacotesEnviados devolve o mesmo resumo; com outro total, 409 FECHAMENTO_DIVERGENTE."},
         "rateLimiting": rate,
         "linkedRequirements": rfs + (["RF-MOD-INGESTAO-05"] if "RF-MOD-INGESTAO-05" not in rfs else []),
         "linkedBusinessRules": rns,
         "securityControls": ["SEC-001", "SEC-005", "SEC-007", "SEC-016"],
         "x-open-questions": []},
    ]

# ---------------------------------------------------------------- callback do provedor
paths["/provedor/eventos-entrega"] = {"post": {
    "operationId": "registrarEventoEntrega",
    "tags": ["Retorno do provedor de mensagens"],
    "summary": "Receber o status de entrega de uma mensagem",
    "description": (
        "O provedor de e-mail, SMS e WhatsApp informa se uma mensagem foi entregue, lida ou falhou, e o sistema atualiza a comunicação. "
        "Status repetido, ou mais antigo que o atual, não muda nada e devolve 200 com alterado=false. "
        "Identificador desconhecido é recusado com 404 e o evento fica registrado para análise. "
        "Sem retorno do provedor, a comunicação fica como Enviada (integração INT-09)."),
    "security": [{"OAuthProvedor": ["provedor.status"]}],
    "requestBody": {"required": True, "description": "Corpo em JSON conforme o schema abaixo; campos fora do contrato são recusados.", "content": {"application/json": {"schema": REF("EventoEntrega"), "examples": {
        "entregue": {"summary": "Mensagem entregue", "value": {"idProvedor": "msg-8f3a2c", "canal": "SMS", "situacao": "ENTREGUE", "dataEvento": "2026-11-13T09:15:00-04:00"}}}}}},
    "responses": {
        "200": {"description": "Status recebido. «alterado» diz se a comunicação mudou de situação.",
                "content": {"application/json": {"schema": REF("ResultadoEventoEntrega"), "examples": {
                    "mudou": {"summary": "Enviado → Entregue", "value": {"idProvedor": "msg-8f3a2c", "situacaoAtual": "ENTREGUE", "alterado": True}},
                    "repetido": {"summary": "Status repetido, nada muda", "value": {"idProvedor": "msg-8f3a2c", "situacaoAtual": "ENTREGUE", "alterado": False}}}}}},
        "400": problem_resp(["CORPO_INVALIDO"], "Corpo inválido: falta idProvedor, situacao ou dataEvento, ou valor fora da lista."),
        "401": problem_resp(["NAO_AUTENTICADO"], "Credencial do provedor ausente, vencida ou inválida."),
        "403": problem_resp(["ACESSO_NEGADO"], "A credencial não é a do provedor de mensagens."),
        "404": problem_resp(["COMUNICACAO_NAO_ENCONTRADA"], "Não há comunicação com este identificador; o evento fica registrado."),
        "429": resp_429(),
        "500": problem_resp(["ERRO_INTERNO"], "Erro inesperado; o provedor pode reenviar o status."),
    },
}}
supl_ops.append({
    "operationId": "registrarEventoEntrega", "method": "POST", "path": "/provedor/eventos-entrega", "integracao": "INT-09",
    "httpSemantics": [
        {"status": 200, "meaning": "Status aplicado (alterado=true) ou ignorado por ser repetido ou mais antigo que o atual (alterado=false). Ordem de avanço: ENVIADO → ENTREGUE → LIDO; FALHA só a partir de ENVIADO."},
        {"status": 400, "meaning": "Campo obrigatório ausente ou situação fora da lista ENTREGUE/LIDO/FALHA."},
        {"status": 401, "meaning": "Credencial do provedor ausente, vencida ou inválida."},
        {"status": 403, "meaning": "Credencial válida, mas de outro sistema (só o provedor escreve aqui — SEC-008)."},
        {"status": 404, "meaning": "idProvedor desconhecido; o sistema recusa e registra o evento (RF-MOD-REGUAS-06, cenário 3)."},
        {"status": 429, "meaning": "Limite de requisições excedido; repetir após Retry-After."},
        {"status": 500, "meaning": "Erro inesperado; o provedor pode reenviar — a repetição é segura."}],
    "idempotency": {"supported": True, "keyHeader": None, "naturalKey": "idProvedor + situacao",
                    "keyFormat": "idProvedor devolvido pelo provedor no envio", "storageTtlSeconds": None,
                    "behavior": "POST naturalmente idempotente: o mesmo status para o mesmo idProvedor não muda nada e devolve 200 com alterado=false (índice único em id_provedor; RF-MOD-REGUAS-06, cenário 2). Não exige Idempotency-Key."},
    "rateLimiting": {"rateLimit": "Limite por credencial do provedor, configurável; valor a definir com o provedor (SEC-005)", "headers": ["Retry-After"], "exceededStatus": 429},
    "linkedRequirements": ["RF-MOD-REGUAS-06", "RF-MOD-REGUAS-07"],
    "linkedBusinessRules": ["RN-NOVO-REG-001"],
    "securityControls": ["SEC-007", "SEC-008", "SEC-016"],
    "x-open-questions": ["Mecanismo de autenticação do provedor no callback ainda não definido (SEC-008; provedor em aberto no GAP-004): o contrato assume OAuth 2.0 por credencial de cliente, como nas fontes."],
})

# questões comuns às operações de ingestão
QA_INGESTAO = [
    "Tamanho máximo do pacote (1.000 registros) e limite de requisições são provisórios: confirmar com cada fonte e com o teste de carga (SEC-005, RSK-05).",
    "Contrato das fontes ainda não fechado com os sistemas parceiros (GAP-001): campos e nomes podem mudar antes da homologação.",
]
QA_FONTE = {
    "mpi": ["As «regras de elegibilidade» que o MPI e o Big Data enviam (ETF §6.3) não têm campos definidos; o contrato cobre só os débitos."],
    "bigdata": ["As «regras de elegibilidade» migradas (ETF §6.3) não têm campos definidos; o contrato cobre só os débitos."],
    "score": ["O contrato assume o score de 0 a 1, como as faixas do produto (RN-NOVO-SCO-002); confirmar com a UFMT."],
    "ccf": ["Vínculo econômico (filial/controladora) não tem fonte declarada na ETF §6.3; não entrou no pacote da CCF."],
}
for op in supl_ops:
    if op["path"].startswith("/ingestao/"):
        slug = op["path"].split("/")[2]
        op["x-open-questions"] = QA_INGESTAO + QA_FONTE.get(slug, [])

# ---------------------------------------------------------------- documento OpenAPI
api = {
    "openapi": "3.0.3",
    "info": {
        "title": "APIs da Cobrança Inteligente — SEFAZ-MT",
        "version": "1.0.0",
        "description": (
            "Contrato das APIs que os sistemas parceiros chamam na aplicação Cobrança Inteligente (escopo x_cbi_ no ServiceNow). "
            "São dois grupos: as 7 APIs de ingestão, uma por fonte, em que cada fonte abre um lote, envia pacotes numerados de registros e fecha o lote; "
            "e o retorno de status de entrega do provedor de mensagens. "
            "As telas usam a interface nativa do ServiceNow e não têm API própria neste contrato. "
            "Erro da requisição inteira vem no formato RFC 7807 com código tipado; erro de um registro vem dentro da resposta 200 do pacote, com o motivo."),
        "contact": {"name": "Equipe da Cobrança Inteligente"},
        "license": {"name": "Uso interno SEFAZ-MT", "url": "https://www.sefaz.mt.gov.br"},
    },
    "servers": [{"url": "https://{instancia}.service-now.com/api/x_cbi/v1",
                 "description": "Instância ServiceNow da SEFAZ-MT; o nome da instância muda por ambiente (desenvolvimento, homologação, produção).",
                 "variables": {"instancia": {"default": "instancia-dev", "description": "Nome da instância ServiceNow do ambiente."}}}],
    "tags": [{"name": f"Ingestão — {f['nome']}", "description": f"Recebe {f['recebe']} da fonte {f['nome']} (integração {f['int']}). {f['nota']}"} for f in FONTES]
    + [{"name": "Retorno do provedor de mensagens", "description": "Recebe do provedor o status de entrega das mensagens enviadas pela régua (integração INT-09)."}],
    "security": [{"OAuthFonte": []}],
    "paths": paths,
    "components": {
        "securitySchemes": {
            "OAuthFonte": {"type": "oauth2", "description": "OAuth 2.0 com um usuário de integração por fonte e REST API Access Policy: cada fonte só alcança o próprio endpoint (SEC-001). O usuário de integração não tem papel de aplicação.",
                           "flows": {"clientCredentials": {"tokenUrl": "https://instancia-dev.service-now.com/oauth_token.do",
                                                           "scopes": {**{ESCOPO(f): f"Enviar lotes da fonte {f['nome']}" for f in FONTES}}}}},
            "OAuthProvedor": {"type": "oauth2", "description": "Credencial OAuth 2.0 própria do provedor de mensagens, só para o retorno de status (SEC-008). Mecanismo a confirmar com o provedor escolhido (GAP-004).",
                              "flows": {"clientCredentials": {"tokenUrl": "https://instancia-dev.service-now.com/oauth_token.do",
                                                              "scopes": {"provedor.status": "Informar status de entrega de mensagens"}}}},
        },
        "parameters": {
            "IdLoteOrigem": {"name": "idLoteOrigem", "in": "path", "required": True,
                             "description": "Identificador do lote na origem, o mesmo usado na abertura.",
                             "schema": {"type": "string", "minLength": 1, "maxLength": 60, "pattern": "^[A-Za-z0-9._-]+$"}, "example": "LOTE-20261113-01"},
            "Sequencia": {"name": "sequencia", "in": "path", "required": True,
                          "description": "Número do pacote dentro do lote, a partir de 1, sem pular.",
                          "schema": {"type": "integer", "minimum": 1, "maximum": 100000}, "example": 1},
        },
        "schemas": SCHEMAS,
    },
}

# ---------------------------------------------------------------- suplemento
supl = {
    "_comment": "Suplemento ao api-contracts.yaml — o que o OpenAPI não cobre: idempotência, semântica de cada status, limites e rastreio. Gerado por spec-api-contracts.",
    "skillVersion": "spec-api-contracts-1.4",
    "schemaVersion": "api-contracts/v1",
    "generatedAt": AGORA,
    "outputLanguage": "pt-BR",
    "conventions": {
        "basePath": "/api/x_cbi/v1",
        "versioning": "Versão no caminho; mudança que quebra abre v2 e mantém v1 até todos os parceiros migrarem (conventions.mdc).",
        "errorFormat": "RFC 7807 para erro da requisição inteira; erro de registro dentro do 200 do pacote, com motivo da lista fechada (conventions.mdc, RN-NOVO-ING-004).",
        "pagination": "Não se aplica: as APIs trabalham por lote e pacote; não há listagem exposta a parceiros.",
        "correlation": "O identificador do lote (fonte + idLoteOrigem) é a chave de correlação dos logs (observability.mdc).",
        "uiBinding": "As telas são nativas do ServiceNow (formulários, listas e Platform Analytics) e leem as tabelas pela própria plataforma, com ACL; nenhuma tela consome estas APIs.",
    },
    "errorCatalog": [
        {"codigo": c, "status": st, "title": t, "detail": d, "x-rn-violada": rn,
         "type": f"urn:x_cbi:erro:{c.lower().replace('_', '-')}"} for c, (st, t, d, rn) in ERROS.items()
    ] + [{"codigo": m, "status": 200, "title": "Registro rejeitado", "nivel": "registro",
          "detail": "Motivo de rejeição por registro dentro da resposta 200 do pacote.", "x-rn-violada": "RN-NOVO-ING-004"}
         for m in ["DOC_INVALIDO", "CAMPO_AUSENTE", "CONTRIB_NAO_ENCONTRADO", "FORMATO_INVALIDO", "OUTRO"]],
    "businessRuleCoverage": [
        {"rn": "RN-NOVO-ING-004", "como": "Registro com documento inválido sai como REJEITADO/DOC_INVALIDO na resposta 200 do pacote — por convenção do projeto não vira 4xx (conventions.mdc)."},
        {"rn": "RN-NOVO-ING-005", "como": "409 LOTE_JA_FECHADO, 409 PACOTE_DIVERGENTE, 409 FECHAMENTO_DIVERGENTE e 422 SEQUENCIA_INVALIDA; repetição idêntica devolve a resposta original."},
        {"rn": "RN-NOVO-ING-006", "como": "422 PACOTES_FALTANTES mantém o lote aberto; o fechamento do ciclo (job, sem API) marca FALHA e mantém a última carga válida."},
        {"rn": "RN-NOVO-ING-008", "como": "403 ACESSO_NEGADO: só o usuário de integração da fonte grava pela API dela; nenhuma operação de escrita para usuário humano."},
        {"rn": "RN-NOVO-ING-001", "como": "Sem erro próprio: a consolidação roda depois do fechamento, fora da API."},
        {"rn": "RN-NOVO-ING-002", "como": "Sem erro próprio: débito com situacao=REGULARIZADO encerra a abordagem no job intraciclo."},
        {"rn": "RN-NOVO-ING-003", "como": "Sem erro próprio: débito repetido entre MPI e Big Data é aceito e consolidado como um só."},
        {"rn": "RN-NOVO-ING-007", "como": "Sem erro próprio: a sinalização é gravada só para leitura."},
        {"rn": "RN-NOVO-REG-001", "como": "O status FALHA do provedor devolve a comunicação ao reenvio até o limite; não há erro ao provedor."},
    ],
    "asyncNotExposed": [
        {"nome": "Fechamento do ciclo diário de carga", "porque": "Job agendado interno (Scheduled Flow); sem fronteira REST."},
        {"nome": "Motor de réguas e envio ao provedor (INT-08)", "porque": "Chamada de saída por REST Message; o contrato é do provedor, não desta aplicação (GAP-004)."},
        {"nome": "Atualização intraciclo e coleta do Platform Analytics", "porque": "Jobs internos."},
    ],
    "operations": supl_ops,
}

(SAIDA / "api-contracts.yaml").write_text(
    "# Contratos de API da Cobrança Inteligente — gerado por spec-api-contracts. Não editar à mão: regerar.\n"
    + yaml.dump(api, Dumper=SemAlias, sort_keys=False, allow_unicode=True, width=120), encoding="utf-8")
(SAIDA / "api-contracts-supplement.json").write_text(json.dumps(supl, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("operações:", sum(len(v) for v in paths.values()), "paths:", len(paths))
