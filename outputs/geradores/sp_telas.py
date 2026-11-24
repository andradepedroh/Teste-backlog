"""Telas (PR) e flow-map da spec-product — Cobrança Inteligente."""

TRIB = "`ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST; `IPVA` — IPVA; `ITCD` — ITCD"
SIT_COB = "`SEM_ACAO` — Sem ação; `NOTIFICADO` — Notificado; `EM_COBRANCA` — Em cobrança; `REGULARIZADO` — Regularizado"
CANAL = "`EMAIL` — E-mail; `SMS` — SMS; `WHATSAPP` — WhatsApp"

# (campo, rótulo, tipo, obrig, seleção, opções, origem, máscara, default, limites, validação, rf)
TELAS = [
 dict(tel="TEL-001", pr="PR-MOD-INGESTAO-001", nome="Integrações & Sincronização", rota="/x_cbi_fonte_list.do", mod="MOD-INGESTAO",
      rfs=["RF-MOD-INGESTAO-01", "RF-MOD-INGESTAO-02", "RF-MOD-INGESTAO-04", "RF-MOD-INGESTAO-05", "RF-MOD-INGESTAO-06", "RF-MOD-INGESTAO-07", "RF-MOD-INGESTAO-08", "RF-MOD-INGESTAO-11", "RF-MOD-INGESTAO-15"],
      etp=["ETP-003", "ETP-004"], persona="Gestor de Integração", prio="Must", f="F-018",
      ctx="Todo dia, depois do horário-limite das fontes, o gestor confere quem entregou e trata as rejeições.",
      req="Mostrar numa lista única a situação de cada fonte, o último lote e os registros rejeitados, com reprocesso a partir da própria lista.",
      crit=["A fonte em Falha aparece no topo, com destaque, sem rolar a página", "O reprocesso de um registro mostra o resultado na mesma linha em até 5 segundos"],
      anti="Obrigar o gestor a abrir cada lote para descobrir se houve rejeição",
      estados={"Carregando": "lista com indicador de carregamento", "Sucesso": "fontes com situação e hora da última carga", "Erro de validação": "reprocesso recusado mostra o motivo na linha", "Erro de sistema": "mensagem «Não foi possível carregar as fontes. Tente de novo.»", "Vazio": "«Nenhuma fonte cadastrada»", "Offline": "aviso da instância de que a conexão caiu; nada é gravado"},
      campos=[("fonte", "Fonte", "select", "Não", "múltipla", "`CCF` — CCF; `MPI` — MPI; `BIG_DATA` — Big Data; `IPVA` — IPVA; `ITCD` — ITCD; `SNE_DTE` — SNE/DT-e; `SCORE_UFMT` — Score UFMT", "static", "—", "todas", "—", "—", "RF-MOD-INGESTAO-05"),
              ("statusFonte", "Situação da fonte", "select", "Não", "múltipla", "`OK` — OK; `EM_TRANSICAO` — Em transição; `FALHA` — Falha", "enum:StatusFonte", "—", "—", "—", "—", "RF-MOD-INGESTAO-05"),
              ("statusLote", "Situação do lote", "select", "Não", "múltipla", "`EM_ANDAMENTO` — Em andamento; `OK` — OK; `PARCIAL` — Parcial; `FALHA` — Falha", "enum:StatusLote", "—", "—", "—", "—", "RF-MOD-INGESTAO-01"),
              ("dataLote", "Data do lote", "daterange", "Não", "—", "—", "—", "DD/MM/AAAA", "últimos 7 dias", "máx. 90 dias", "intervalo acima de 90 dias → «Escolha no máximo 90 dias»", "RF-MOD-INGESTAO-05"),
              ("motivoRejeicao", "Motivo da rejeição", "select", "Não", "múltipla", "`DOC_INVALIDO` — CPF/CNPJ inválido; `CAMPO_AUSENTE` — Campo obrigatório ausente; `CONTRIB_NAO_ENCONTRADO` — Contribuinte não encontrado; `FORMATO_INVALIDO` — Formato inválido; `OUTRO` — Outro", "enum:MotivoRejeicao", "—", "—", "—", "—", "RF-MOD-INGESTAO-02"),
              ("pctMigracao", "% de migração MPI", "readonly", "Não", "—", "—", "—", "0%", "—", "0 a 100%", "—", "RF-MOD-INGESTAO-11")],
      grid={"Colunas exibidas (em ordem)": "Fonte, Situação, Última carga (DD/MM/AAAA hh:mm), Lidos, Aceitos, Rejeitados, % de migração", "Ordenação default": "Situação (Falha primeiro), depois Fonte", "Paginação": "20 por página", "Ações por linha": "Ver lotes; Ver rejeitados; Reprocessar (na lista de rejeitados)", "Mensagem de lista vazia": "«Nenhuma fonte cadastrada»"},
      filtros={"Aplica": "ao alterar o campo", "Combinação entre filtros": "AND", "Limpar todos de uma vez": "sim", "Persistência do filtro": "filtro salvo da lista", "Dependências entre filtros": "Motivo da rejeição só se aplica à lista de rejeitados"}),
 dict(tel="TEL-002", pr="PR-MOD-INGESTAO-002", nome="Carteira Consolidada", rota="/x_cbi_posicao_tributo_list.do", mod="MOD-INGESTAO",
      rfs=["RF-MOD-INGESTAO-14", "RF-MOD-INGESTAO-03"], etp=["ETP-005"], persona="Coordenador de Cobrança", prio="Should", f="F-019",
      ctx="O coordenador analisa a base antes de definir os critérios do ciclo.",
      req="Listar a posição contribuinte × tributo com filtros salvos por tributo, atraso, valor e situação.",
      crit=["Filtrar 1,8 milhão de posições por tributo e atraso devolve a primeira página em até 3 segundos", "O total de posições filtradas aparece acima da lista"],
      anti="Exibir a lista sem total nem filtro salvo, obrigando a remontar o filtro a cada ciclo",
      estados={"Carregando": "lista com indicador de carregamento", "Sucesso": "posições com valor, atraso e situação", "Erro de validação": "valor mínimo maior que o máximo → mensagem no filtro", "Erro de sistema": "«Não foi possível carregar a carteira. Tente de novo.»", "Vazio": "«Nenhuma posição encontrada para os filtros»", "Offline": "aviso da instância; nada é gravado"},
      campos=[("tributo", "Tributo", "select", "Não", "múltipla", TRIB, "enum:Tributo", "—", "todos", "—", "—", "RF-MOD-INGESTAO-14"),
              ("atrasoMin", "Atraso mínimo (dias)", "number", "Não", "—", "—", "—", "inteiro", "—", "0 a 9999", "negativo → «Informe zero ou mais dias»", "RF-MOD-INGESTAO-14"),
              ("valorMin", "Valor mínimo em aberto", "currency", "Não", "—", "—", "—", "R$ 0,00", "—", "≥ 0", "maior que o valor máximo → «O mínimo não pode passar do máximo»", "RF-MOD-INGESTAO-14"),
              ("valorMax", "Valor máximo em aberto", "currency", "Não", "—", "—", "—", "R$ 0,00", "—", "≥ 0", "—", "RF-MOD-INGESTAO-14"),
              ("statusCobranca", "Situação da cobrança", "select", "Não", "múltipla", "`NOTIFICADO` — Notificado; `EM_COBRANCA` — Em cobrança; `REGULARIZADO` — Regularizado", "enum:StatusCobrancaTributo", "—", "—", "—", "—", "RF-MOD-INGESTAO-14"),
              ("statusParcelamento", "Parcelamento", "select", "Não", "múltipla", "`SEM_PARCELAMENTO` — Sem parcelamento; `ATIVO` — Ativo; `EM_RISCO` — Em risco", "enum:StatusParcelamentoPosicao", "—", "—", "—", "—", "RF-MOD-INGESTAO-10")],
      grid={"Colunas exibidas (em ordem)": "Contribuinte (nome), Documento (CPF mascarado), Tributo, Total em aberto, Maior atraso (dias), Qtd. débitos, Parcelamento, Situação da cobrança", "Ordenação default": "Total em aberto, do maior para o menor", "Paginação": "50 por página", "Ações por linha": "Abrir contribuinte", "Mensagem de lista vazia": "«Nenhuma posição encontrada para os filtros»"},
      filtros={"Aplica": "ao acionar o botão «Aplicar»", "Combinação entre filtros": "AND", "Limpar todos de uma vez": "sim", "Persistência do filtro": "filtro salvo da lista", "Dependências entre filtros": "—"}),
 dict(tel="TEL-003", pr="PR-MOD-INGESTAO-003", nome="Visão Única do Contribuinte", rota="/x_cbi_contribuinte.do", mod="MOD-INGESTAO",
      rfs=["RF-MOD-INGESTAO-13", "RF-MOD-INGESTAO-09", "RF-MOD-INGESTAO-10", "RF-MOD-INGESTAO-12", "RF-MOD-GOVERNANCA-03"], etp=["ETP-006"], persona="Coordenador de Cobrança", prio="Must", f="F-020",
      ctx="O coordenador ou o atendente precisa ver tudo de um contribuinte antes de decidir ou contatar.",
      req="Reunir no formulário do contribuinte os débitos, parcelamentos, comunicações e sinalizações, com o CPF mascarado.",
      crit=["Todas as listas relacionadas aparecem no mesmo formulário, sem abrir outra tela", "Parcelamento em risco aparece destacado na lista"],
      anti="Mostrar o CPF completo por padrão",
      estados={"Carregando": "formulário com indicador de carregamento", "Sucesso": "cabeçalho do contribuinte e listas relacionadas", "Erro de validação": "— (formulário só de leitura; dados gravados pela carga)", "Erro de sistema": "«Não foi possível abrir o contribuinte. Tente de novo.»", "Vazio": "lista relacionada sem registro mostra «Nenhum registro»", "Offline": "aviso da instância"},
      campos=[("documento", "CPF/CNPJ", "readonly", "Sim", "—", "—", "—", "CPF mascarado: ***.***.***-NN; CNPJ completo", "—", "14 dígitos", "—", "RF-MOD-GOVERNANCA-03"),
              ("tipo", "Tipo de pessoa", "readonly", "Sim", "única", "`PF` — Pessoa física; `PJ` — Pessoa jurídica", "enum:TipoPessoa", "—", "—", "—", "—", "RF-MOD-INGESTAO-13"),
              ("nome", "Nome ou razão social", "readonly", "Sim", "—", "—", "—", "—", "—", "150 caracteres", "—", "RF-MOD-INGESTAO-13"),
              ("segmentoAtual", "Segmento no ciclo", "readonly", "Não", "única", "`MASSIFICADA` — Massificada; `QUALIFICADA` — Qualificada; `SEM_CARTEIRA` — Sem carteira", "enum:SegmentoContribuinte", "—", "—", "—", "—", "RF-MOD-INGESTAO-13"),
              ("statusCobranca", "Situação da cobrança", "readonly", "Sim", "única", SIT_COB, "enum:StatusCobranca", "—", "—", "—", "—", "RF-MOD-INGESTAO-09"),
              ("totalEmAberto", "Total em aberto", "readonly", "Não", "—", "—", "—", "R$ 0,00", "—", "—", "—", "RF-MOD-INGESTAO-13"),
              ("contumaz", "Devedor contumaz", "readonly", "Não", "—", "—", "—", "Sim/Não", "—", "—", "—", "RF-MOD-INGESTAO-13")],
      grid={"Colunas exibidas (em ordem)": "Débitos: Tributo, Valor, Vencimento, Instrumento, Fonte, Situação · Parcelamentos: Número, Tributo, Parcelas em atraso, Situação · Comunicações: Data, Canal, Régua, Situação · Sinalizações: Tipo, Data, Ativa", "Ordenação default": "mais recente primeiro em cada lista", "Paginação": "10 por lista relacionada", "Ações por linha": "nenhuma (somente leitura)", "Mensagem de lista vazia": "«Nenhum registro»"},
      filtros=None),
 dict(tel="TEL-004", pr="PR-MOD-QUALIFICACAO-001", nome="Critérios de Qualificação", rota="/x_cbi_criterio_versao.do", mod="MOD-QUALIFICACAO",
      rfs=["RF-MOD-QUALIFICACAO-01", "RF-MOD-QUALIFICACAO-02"], etp=["ETP-007", "ETP-009"], persona="Coordenador de Cobrança", prio="Must", f="F-021",
      ctx="A cada ciclo, o coordenador revisa os critérios e publica uma versão.",
      req="Editar o rascunho de critérios e publicar com fundamentação, mostrando o histórico de versões.",
      crit=["O botão «Publicar» só fica habilitado com prévia vigente e fundamentação preenchida", "A versão publicada aparece como somente leitura"],
      anti="Permitir publicar sem prévia ou editar versão publicada",
      estados={"Carregando": "formulário com indicador", "Sucesso": "«Versão N publicada»", "Erro de validação": "mensagem junto ao campo inválido", "Erro de sistema": "«Não foi possível salvar. Tente de novo.»", "Vazio": "sem versão publicada: «Nenhuma versão publicada ainda»", "Offline": "aviso da instância; rascunho não é salvo"},
      campos=[("tributos", "Tributos", "multiselect", "Sim", "múltipla", TRIB, "enum:Tributo", "—", "—", "≥ 1", "nenhum → «Escolha ao menos um tributo»", "RF-MOD-QUALIFICACAO-01"),
              ("valorMin", "Valor mínimo em aberto", "currency", "Sim", "—", "—", "—", "R$ 0,00", "R$ 0,00", "≥ 0", "negativo → «O valor mínimo deve ser zero ou maior»", "RF-MOD-QUALIFICACAO-01"),
              ("atrasoMin", "Atraso mínimo (dias)", "number", "Sim", "—", "—", "—", "inteiro", "0", "0 a 9999", "negativo → «Informe zero ou mais dias»", "RF-MOD-QUALIFICACAO-01"),
              ("instrumentos", "Instrumentos", "multiselect", "Não", "múltipla", "`AUTO_INFRACAO` — Auto de infração; `DECLARACAO` — Declaração; `OUTRO` — Outro", "enum:Instrumento", "—", "todos", "—", "—", "RF-MOD-QUALIFICACAO-01"),
              ("excluirContumazes", "Excluir contumazes", "toggle", "Não", "—", "—", "—", "—", "Sim", "—", "—", "RF-MOD-QUALIFICACAO-01"),
              ("limiteScore", "Score mínimo (só para quem tem score)", "number", "Não", "—", "—", "—", "0,00", "vazio", "0 a 1", "fora de 0 a 1 → «Informe um valor entre 0 e 1»", "RF-MOD-QUALIFICACAO-01"),
              ("tipoAlvo", "Segmento-alvo", "select", "Sim", "única", "`MASSIFICADA` — Massificada; `QUALIFICADA` — Qualificada", "enum:SegmentoAlvo", "—", "—", "—", "vazio → «Escolha o segmento-alvo»", "RF-MOD-QUALIFICACAO-01"),
              ("fundamentacao", "Fundamentação", "textarea", "Sim (para publicar)", "—", "—", "—", "—", "—", "até 2000 caracteres", "vazio ao publicar → «Informe a fundamentação para publicar»", "RF-MOD-QUALIFICACAO-02")],
      grid={"Colunas exibidas (em ordem)": "Versão, Estado (Rascunho/Publicada), Publicada por, Data de publicação", "Ordenação default": "Versão, da maior para a menor", "Paginação": "20 por página", "Ações por linha": "Abrir; Criar rascunho a partir desta", "Mensagem de lista vazia": "«Nenhuma versão publicada ainda»"},
      filtros=None),
 dict(tel="TEL-005", pr="PR-MOD-QUALIFICACAO-002", nome="Prévia da Carteira Segmentada", rota="/x_cbi_carteira_item_list.do", mod="MOD-QUALIFICACAO",
      rfs=["RF-MOD-QUALIFICACAO-03", "RF-MOD-QUALIFICACAO-04", "RF-MOD-QUALIFICACAO-05", "RF-MOD-QUALIFICACAO-06", "RF-MOD-SCORE-03"], etp=["ETP-008", "ETP-010"], persona="Coordenador de Cobrança", prio="Must", f="F-022",
      ctx="Antes de publicar e confirmar, o coordenador confere o tamanho e a composição da carteira.",
      req="Mostrar os itens da carteira simulada por segmento e grupo de controle, com o botão de confirmação.",
      crit=["Os totais por segmento e de grupo de controle aparecem acima da lista", "«Confirmar carteira» só aparece com versão publicada"],
      anti="Confirmar a carteira sem mostrar o tamanho do grupo de controle",
      estados={"Carregando": "«Gerando a prévia…» com indicador", "Sucesso": "totais e lista de itens", "Erro de validação": "confirmação com rascunho → «Só é possível confirmar com versão publicada»", "Erro de sistema": "«Não foi possível gerar a prévia. Tente de novo.»", "Vazio": "«Nenhum contribuinte atende aos critérios»", "Offline": "aviso da instância"},
      campos=[("segmento", "Segmento", "select", "Não", "múltipla", "`MASSIFICADA` — Massificada; `QUALIFICADA` — Qualificada", "enum:SegmentoAlvo", "—", "todos", "—", "—", "RF-MOD-QUALIFICACAO-04"),
              ("controle", "Grupo de controle", "select", "Não", "única", "`SIM` — Só controle; `NAO` — Só cobrada; `TODOS` — Todos", "static", "—", "TODOS", "—", "—", "RF-MOD-QUALIFICACAO-05"),
              ("tributo", "Tributo", "select", "Não", "múltipla", TRIB, "enum:Tributo", "—", "todos", "—", "—", "RF-MOD-QUALIFICACAO-03"),
              ("comScore", "Score", "select", "Não", "única", "`COM` — Com score; `SEM` — Sem score; `TODOS` — Todos", "static", "—", "TODOS", "—", "—", "RF-MOD-SCORE-03")],
      grid={"Colunas exibidas (em ordem)": "Contribuinte, Tributo, Total em aberto, Maior atraso, Score (ou «Sem score»), Segmento, Controle", "Ordenação default": "Total em aberto, do maior para o menor", "Paginação": "50 por página", "Ações por linha": "Abrir contribuinte", "Mensagem de lista vazia": "«Nenhum contribuinte atende aos critérios»"},
      filtros={"Aplica": "ao alterar o campo", "Combinação entre filtros": "AND", "Limpar todos de uma vez": "sim", "Persistência do filtro": "nenhuma", "Dependências entre filtros": "—"}),
 dict(tel="TEL-006", pr="PR-MOD-SCORE-001", nome="Painel do Score de Liquidez", rota="/$pa_dashboard.do?name=painel-score-liquidez", mod="MOD-SCORE",
      rfs=["RF-MOD-SCORE-04", "RF-MOD-SCORE-01", "RF-MOD-SCORE-02"], etp=["ETP-012"], persona="Gestor de Integração", prio="Should", f="F-029",
      ctx="O gestor e o coordenador acompanham se o score chega e cobre a carteira.",
      req="Mostrar cobertura por tributo, score médio, distribuição por faixa e últimos lotes, com filtro de ciclo e tributo.",
      crit=["Os quatro indicadores aparecem sem rolar a página em tela de 1366 × 768", "Cada visualização mostra a data da última coleta"],
      anti="Mostrar média de score sem a cobertura, escondendo que a maioria não tem score",
      estados={"Carregando": "visualizações com indicador", "Sucesso": "indicadores do ciclo", "Erro de validação": "—", "Erro de sistema": "«Não foi possível carregar o painel. Tente de novo.»", "Vazio": "«Nenhum lote de score recebido»", "Offline": "aviso da instância"},
      campos=[("ciclo", "Ciclo", "month", "Não", "única", "*(dinâmica)*", "endpoint:ciclos coletados no Platform Analytics", "MM/AAAA", "ciclo atual", "—", "—", "RF-MOD-SCORE-04"),
              ("tributo", "Tributo", "select", "Não", "múltipla", TRIB, "enum:Tributo", "—", "todos", "—", "—", "RF-MOD-SCORE-04")],
      grid={"Colunas exibidas (em ordem)": "Últimos lotes: Data, Versão do modelo, Lidos, Aceitos, Rejeitados", "Ordenação default": "Data, mais recente primeiro", "Paginação": "10 últimos lotes", "Ações por linha": "nenhuma", "Mensagem de lista vazia": "«Nenhum lote de score recebido»"},
      filtros={"Aplica": "ao alterar o campo", "Combinação entre filtros": "AND", "Limpar todos de uma vez": "sim", "Persistência do filtro": "sessão", "Dependências entre filtros": "—"}),
 dict(tel="TEL-007", pr="PR-MOD-REGUAS-001", nome="Editor de Régua", rota="/x_cbi_regua.do", mod="MOD-REGUAS",
      rfs=["RF-MOD-REGUAS-01", "RF-MOD-REGUAS-08"], etp=["ETP-013"], persona="Coordenador de Cobrança", prio="Must", f="F-023",
      ctx="O coordenador monta e ajusta a régua de cada segmento.",
      req="Cadastrar a régua com etapas ordenadas por prazo, canal e modelo, e pausar ou retomar a régua.",
      crit=["As etapas aparecem sempre ordenadas pelo prazo", "Ao pausar, o sistema pede confirmação e informa que o enviado não é cancelado"],
      anti="Permitir duas réguas ativas para o mesmo segmento",
      estados={"Carregando": "formulário com indicador", "Sucesso": "«Régua salva»", "Erro de validação": "etapa duplicada → «Já existe etapa neste prazo e canal»", "Erro de sistema": "«Não foi possível salvar a régua. Tente de novo.»", "Vazio": "régua sem etapa: «Adicione a primeira etapa»", "Offline": "aviso da instância; nada é salvo"},
      campos=[("nome", "Nome da régua", "text", "Sim", "—", "—", "—", "—", "—", "até 80 caracteres", "vazio → «Informe o nome da régua»", "RF-MOD-REGUAS-01"),
              ("segmento", "Segmento", "select", "Sim", "única", "`PARCELAMENTOS_INADIMPLENTES` — Parcelamentos inadimplentes; `IPVA` — IPVA; `ITCD` — ITCD; `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST", "enum:SegmentoRegua", "—", "—", "—", "segmento com régua ativa → «Já existe régua ativa para este segmento»", "RF-MOD-REGUAS-01"),
              ("estado", "Estado", "select", "Sim", "única", "`RASCUNHO` — Rascunho; `ATIVA` — Ativa; `PAUSADA` — Pausada", "enum:EstadoRegua", "—", "RASCUNHO", "—", "—", "RF-MOD-REGUAS-08"),
              ("etapaOffset", "Prazo da etapa (dias)", "number", "Sim", "—", "—", "—", "inteiro", "—", "0 a 365", "fora de 0 a 365 → «Informe de 0 a 365 dias»", "RF-MOD-REGUAS-01"),
              ("etapaCanal", "Canal da etapa", "select", "Sim", "única", CANAL, "enum:Canal", "—", "—", "—", "—", "RF-MOD-REGUAS-01"),
              ("etapaModelo", "Modelo de mensagem", "lookup", "Sim", "única", "*(dinâmica)*", "domainTable:x_cbi_template (filtrado pelo canal)", "—", "—", "—", "modelo de outro canal → «Escolha um modelo do mesmo canal»", "RF-MOD-REGUAS-01")],
      grid={"Colunas exibidas (em ordem)": "Etapas: Prazo (dias), Canal, Modelo", "Ordenação default": "Prazo, crescente", "Paginação": "sem paginação", "Ações por linha": "Editar; Remover (só em rascunho)", "Mensagem de lista vazia": "«Adicione a primeira etapa»"},
      filtros=None),
 dict(tel="TEL-008", pr="PR-MOD-REGUAS-002", nome="Execução & Status de Disparo", rota="/x_cbi_comunicacao_list.do", mod="MOD-REGUAS",
      rfs=["RF-MOD-REGUAS-09", "RF-MOD-REGUAS-02", "RF-MOD-REGUAS-04", "RF-MOD-REGUAS-05", "RF-MOD-REGUAS-06", "RF-MOD-REGUAS-07", "RF-MOD-REGUAS-03"], etp=["ETP-015"], persona="Coordenador de Cobrança", prio="Should", f="F-024",
      ctx="O coordenador confere o envio do dia e as falhas.",
      req="Listar as comunicações por régua, canal e situação, com filtros.",
      crit=["O total por situação aparece acima da lista", "Comunicação em «Falha definitiva» aparece destacada"],
      anti="Esconder as comunicações não enviadas por falta de consentimento",
      estados={"Carregando": "lista com indicador", "Sucesso": "comunicações com situação", "Erro de validação": "—", "Erro de sistema": "«Não foi possível carregar as comunicações. Tente de novo.»", "Vazio": "«Nenhuma comunicação para esta régua»", "Offline": "aviso da instância"},
      campos=[("regua", "Régua", "lookup", "Não", "múltipla", "*(dinâmica)*", "domainTable:x_cbi_regua", "—", "todas", "—", "—", "RF-MOD-REGUAS-09"),
              ("canal", "Canal", "select", "Não", "múltipla", CANAL, "enum:Canal", "—", "todos", "—", "—", "RF-MOD-REGUAS-09"),
              ("situacao", "Situação", "select", "Não", "múltipla", "`PENDENTE` — Pendente; `ENVIADO` — Enviado; `ENTREGUE` — Entregue; `LIDO` — Lido; `FALHA` — Falha; `FALHA_DEFINITIVA` — Falha definitiva; `SEM_OPT_IN` — Sem opt-in", "enum:StatusComunicacao", "—", "todas", "—", "—", "RF-MOD-REGUAS-06"),
              ("data", "Data de envio", "daterange", "Não", "—", "—", "—", "DD/MM/AAAA", "hoje", "máx. 31 dias", "intervalo acima de 31 dias → «Escolha no máximo 31 dias»", "RF-MOD-REGUAS-09")],
      grid={"Colunas exibidas (em ordem)": "Data, Contribuinte, Régua, Etapa, Canal, Situação, Tentativas", "Ordenação default": "Data, mais recente primeiro", "Paginação": "50 por página", "Ações por linha": "Abrir comunicação", "Mensagem de lista vazia": "«Nenhuma comunicação para esta régua»"},
      filtros={"Aplica": "ao alterar o campo", "Combinação entre filtros": "AND", "Limpar todos de uma vez": "sim", "Persistência do filtro": "filtro salvo da lista", "Dependências entre filtros": "—"}),
 dict(tel="TEL-009", pr="PR-MOD-QUALIFICADA-001", nome="Minha Fila", rota="/x_cbi_caso_list.do?sysparm_query=assigned_to=javascript:gs.getUserID()", mod="MOD-QUALIFICADA",
      rfs=["RF-MOD-QUALIFICADA-03", "RF-MOD-QUALIFICADA-01", "RF-MOD-QUALIFICADA-02", "RF-MOD-GOVERNANCA-02"], etp=["ETP-018"], persona="Atendente de Cobrança", prio="Must", f="F-025",
      ctx="O atendente começa o dia pela própria fila.",
      req="Mostrar só os casos do atendente, ordenados por prioridade.",
      crit=["A fila abre direto ordenada por prioridade, sem filtro manual", "Nenhum caso de outro atendente aparece"],
      anti="Mostrar comparativo com outros atendentes",
      estados={"Carregando": "lista com indicador", "Sucesso": "casos ordenados por prioridade", "Erro de validação": "—", "Erro de sistema": "«Não foi possível carregar sua fila. Tente de novo.»", "Vazio": "«Você não tem casos abertos»", "Offline": "aviso da instância"},
      campos=[("estagio", "Estágio", "select", "Não", "múltipla", "`NOVO` — Novo; `PRIMEIRO_CONTATO` — 1º contato; `NEGOCIACAO` — Negociação; `FOLLOW_UP` — Follow-up", "enum:EstagioCaso", "—", "todos (casos abertos)", "—", "—", "RF-MOD-QUALIFICADA-03"),
              ("tributo", "Tributo", "select", "Não", "múltipla", TRIB, "enum:Tributo", "—", "todos", "—", "—", "RF-MOD-QUALIFICADA-03")],
      grid={"Colunas exibidas (em ordem)": "Prioridade, Número do caso (CQ-AAAA-NNNN), Contribuinte, Total em aberto, Maior atraso, Próximo follow-up, Estágio", "Ordenação default": "Prioridade, da maior para a menor", "Paginação": "25 por página", "Ações por linha": "Abrir caso", "Mensagem de lista vazia": "«Você não tem casos abertos»"},
      filtros={"Aplica": "ao alterar o campo", "Combinação entre filtros": "AND", "Limpar todos de uma vez": "sim", "Persistência do filtro": "sessão", "Dependências entre filtros": "—"}),
 dict(tel="TEL-010", pr="PR-MOD-QUALIFICADA-002", nome="Dossiê & Caso", rota="/x_cbi_caso.do", mod="MOD-QUALIFICADA",
      rfs=["RF-MOD-QUALIFICADA-04", "RF-MOD-QUALIFICADA-05", "RF-MOD-QUALIFICADA-06", "RF-MOD-QUALIFICADA-07"], etp=["ETP-019"], persona="Atendente de Cobrança", prio="Must", f="F-026",
      ctx="O atendente prepara e registra cada contato com o contribuinte.",
      req="Reunir no caso o dossiê do contribuinte e permitir registrar interações e follow-ups.",
      crit=["A interação salva aparece na lista sem recarregar a página", "Interação salva não tem botão de editar nem excluir"],
      anti="Permitir editar interação já registrada",
      estados={"Carregando": "formulário com indicador", "Sucesso": "«Interação registrada»", "Erro de validação": "follow-up no passado → «A data do follow-up deve ser hoje ou futura»", "Erro de sistema": "«Não foi possível salvar. Tente de novo.»", "Vazio": "lista sem registro mostra «Nenhum registro»", "Offline": "aviso da instância; nada é salvo"},
      campos=[("interacaoTipo", "Tipo de contato", "select", "Sim", "única", "`LIGACAO` — Ligação; `EMAIL` — E-mail; `REUNIAO` — Reunião; `WHATSAPP` — WhatsApp (`SISTEMA` — Sistema é só para eventos automáticos, não aparece para o atendente)", "enum:TipoInteracao", "—", "—", "—", "vazio → «Escolha o tipo de contato»", "RF-MOD-QUALIFICADA-05"),
              ("interacaoResultado", "Resultado", "select", "Sim", "única", "`NEGOCIACAO_EM_CURSO` — Negociação em curso; `SEM_CONTATO` — Sem contato; `PROMESSA_PAGAMENTO` — Promessa de pagamento; `RECUSA` — Recusa", "enum:ResultadoInteracao", "—", "—", "—", "vazio → «Escolha o resultado»", "RF-MOD-QUALIFICADA-05"),
              ("interacaoDescricao", "Descrição", "textarea", "Sim", "—", "—", "—", "—", "—", "até 2000 caracteres", "vazio → «Descreva o contato»", "RF-MOD-QUALIFICADA-05"),
              ("followupData", "Data do follow-up", "date", "Não", "—", "—", "—", "DD/MM/AAAA", "—", "hoje ou futura", "passado → «A data do follow-up deve ser hoje ou futura»", "RF-MOD-QUALIFICADA-06"),
              ("atribuidoA", "Atendente", "lookup", "Sim", "única", "*(dinâmica)*", "domainTable:sys_user (papel atendente)", "—", "atendente atual", "—", "só o coordenador altera", "RF-MOD-QUALIFICADA-07")],
      grid={"Colunas exibidas (em ordem)": "Débitos; Parcelamentos; Interações (Data, Autor, Tipo, Resultado); Follow-ups; Sinalizações; Vínculos econômicos", "Ordenação default": "mais recente primeiro", "Paginação": "10 por lista relacionada", "Ações por linha": "Interações: nenhuma (imutáveis)", "Mensagem de lista vazia": "«Nenhum registro»"},
      filtros=None),
 dict(tel="TEL-011", pr="PR-MOD-MONITORAMENTO-001", nome="Regularizações & Origem", rota="/x_cbi_regularizacao_list.do", mod="MOD-MONITORAMENTO",
      rfs=["RF-MOD-MONITORAMENTO-08", "RF-MOD-MONITORAMENTO-01", "RF-MOD-MONITORAMENTO-02"], etp=["ETP-023"], persona="Coordenador de Cobrança", prio="Should", f="F-027",
      ctx="O coordenador confere de onde vieram as regularizações do ciclo.",
      req="Listar as regularizações com filtros por origem, canal, instrumento e tributo.",
      crit=["O total de valor regularizado por origem aparece acima da lista", "A exportação pede confirmação e fica registrada"],
      anti="Misturar regularizações do grupo de controle com as da carteira cobrada sem identificar",
      estados={"Carregando": "lista com indicador", "Sucesso": "regularizações com origem", "Erro de validação": "—", "Erro de sistema": "«Não foi possível carregar as regularizações. Tente de novo.»", "Vazio": "«Nenhuma regularização para os filtros»", "Offline": "aviso da instância"},
      campos=[("origem", "Origem", "select", "Não", "múltipla", "`ESPONTANEA` — Espontânea; `RESPOSTA_COBRANCA` — Resposta à cobrança", "enum:OrigemRegularizacao", "—", "todas", "—", "—", "RF-MOD-MONITORAMENTO-02"),
              ("canal", "Canal", "select", "Não", "múltipla", CANAL + "; `ATENDIMENTO` — Atendimento", "enum:CanalRegularizacao", "—", "todos", "—", "—", "RF-MOD-MONITORAMENTO-08"),
              ("instrumento", "Instrumento", "select", "Não", "múltipla", "`REGUA_MASSIFICADA` — Régua massificada; `COBRANCA_QUALIFICADA` — Cobrança qualificada", "enum:InstrumentoRegularizacao", "—", "todos", "—", "—", "RF-MOD-MONITORAMENTO-08"),
              ("tributo", "Tributo", "select", "Não", "múltipla", TRIB, "enum:Tributo", "—", "todos", "—", "—", "RF-MOD-MONITORAMENTO-08"),
              ("periodo", "Período", "daterange", "Não", "—", "—", "—", "DD/MM/AAAA", "ciclo atual", "máx. 12 meses", "—", "RF-MOD-MONITORAMENTO-08")],
      grid={"Colunas exibidas (em ordem)": "Data, Contribuinte, Tributo, Valor, Origem, Canal, Instrumento, Controle", "Ordenação default": "Data, mais recente primeiro", "Paginação": "50 por página", "Ações por linha": "Abrir contribuinte", "Mensagem de lista vazia": "«Nenhuma regularização para os filtros»"},
      filtros={"Aplica": "ao alterar o campo", "Combinação entre filtros": "AND", "Limpar todos de uma vez": "sim", "Persistência do filtro": "filtro salvo da lista", "Dependências entre filtros": "Canal só se aplica à origem «Resposta à cobrança»"}),
 dict(tel="TEL-012", pr="PR-MOD-MONITORAMENTO-002", nome="Painel Institucional de Cobrança", rota="/$pa_dashboard.do?name=painel-institucional-cobranca", mod="MOD-MONITORAMENTO",
      rfs=["RF-MOD-MONITORAMENTO-07", "RF-MOD-MONITORAMENTO-03", "RF-MOD-MONITORAMENTO-04", "RF-MOD-MONITORAMENTO-05", "RF-MOD-MONITORAMENTO-06"], etp=["ETP-022"], persona="Coordenador de Cobrança", prio="Must", f="F-028",
      ctx="O coordenador presta contas e decide a estratégia do próximo ciclo.",
      req="Mostrar funil, KPIs com variação, tendência cobrada × controle, retorno das réguas e tabela por tributo com meta e alerta.",
      crit=["O efeito incremental aparece em pontos percentuais com o sinal (+/−)", "O alerta de meta lista os tributos abaixo da meta"],
      anti="Mostrar taxa de regularização sem comparar com o grupo de controle",
      estados={"Carregando": "visualizações com indicador", "Sucesso": "indicadores do ciclo", "Erro de validação": "—", "Erro de sistema": "«Não foi possível carregar o painel. Tente de novo.»", "Vazio": "«Sem carteira confirmada no ciclo»", "Offline": "aviso da instância"},
      campos=[("ciclo", "Ciclo", "month", "Não", "única", "*(dinâmica)*", "endpoint:ciclos coletados no Platform Analytics", "MM/AAAA", "ciclo atual", "—", "—", "RF-MOD-MONITORAMENTO-07"),
              ("tributo", "Tributo", "select", "Não", "múltipla", TRIB, "enum:Tributo", "—", "todos", "—", "—", "RF-MOD-MONITORAMENTO-07"),
              ("canal", "Canal", "select", "Não", "múltipla", CANAL, "enum:Canal", "—", "todos", "—", "—", "RF-MOD-MONITORAMENTO-05"),
              ("atendente", "Atendente", "lookup", "Não", "múltipla", "*(dinâmica)*", "domainTable:sys_user (papel atendente)", "—", "todos", "—", "—", "RF-MOD-MONITORAMENTO-07")],
      grid={"Colunas exibidas (em ordem)": "Tabela por tributo: Tributo, Realizado, Meta, Diferença (p.p.)", "Ordenação default": "Tributo", "Paginação": "sem paginação", "Ações por linha": "nenhuma", "Mensagem de lista vazia": "«Sem carteira confirmada no ciclo»"},
      filtros={"Aplica": "ao alterar o campo", "Combinação entre filtros": "AND", "Limpar todos de uma vez": "sim", "Persistência do filtro": "sessão", "Dependências entre filtros": "—"}),
 dict(tel="TEL-013", pr="PR-MOD-GOVERNANCA-001", nome="Parâmetros, faixas de score e metas", rota="/x_cbi_parametro_list.do", mod="MOD-GOVERNANCA",
      rfs=["RF-MOD-GOVERNANCA-05", "RF-MOD-GOVERNANCA-04", "RF-MOD-SCORE-02"], etp=["ETP-024"], persona="Administrador da aplicação", prio="Should", f="F-030",
      ctx="O admin ajusta parâmetros, faixas e metas sem desenvolvimento.",
      req="Manter parâmetros gerais, faixas de score e metas por tributo e ciclo, com histórico das alterações.",
      crit=["Cada alteração mostra, no histórico, valor anterior, valor novo, autor e data", "Valor fora do limite é recusado com mensagem junto ao campo"],
      anti="Permitir que o coordenador ou o atendente alterem parâmetros",
      estados={"Carregando": "lista com indicador", "Sucesso": "«Parâmetro atualizado»", "Erro de validação": "percentual fora do limite → «O percentual deve ficar entre 1% e 20%»", "Erro de sistema": "«Não foi possível salvar. Tente de novo.»", "Vazio": "«Nenhuma meta cadastrada para o ciclo»", "Offline": "aviso da instância; nada é salvo"},
      campos=[("chave", "Parâmetro", "select", "Sim", "única", "`PCT_GRUPO_CONTROLE` — % do grupo de controle; `JANELA_ATRIBUICAO_DIAS` — Janela de atribuição (dias); `LIMITE_REENVIO` — Limite de tentativas de reenvio; `PRAZO_RECEBIMENTO_FONTE` — Horário-limite por fonte", "static", "—", "—", "—", "—", "RF-MOD-GOVERNANCA-05"),
              ("valor", "Valor", "text", "Sim", "—", "—", "—", "conforme o parâmetro", "3% · 30 dias · 3 tentativas", "% de controle entre 1% e 20%; janela entre 1 e 90 dias; reenvio entre 0 e 10", "fora do limite → mensagem do parâmetro", "RF-MOD-GOVERNANCA-05"),
              ("faixaNome", "Nome da faixa", "text", "Sim", "—", "—", "—", "—", "—", "até 30 caracteres", "—", "RF-MOD-SCORE-02"),
              ("faixaLimites", "Limites da faixa", "number", "Sim", "—", "—", "—", "0,00 a 1,00", "—", "inferior < superior", "sobreposição → «As faixas não podem se sobrepor»", "RF-MOD-SCORE-02"),
              ("metaTributo", "Tributo da meta", "select", "Sim", "única", TRIB, "enum:Tributo", "—", "—", "—", "—", "RF-MOD-GOVERNANCA-05"),
              ("metaValor", "Meta de regularização", "percent", "Sim", "—", "—", "—", "0,0%", "—", "0 a 100%", "fora de 0 a 100 → «Informe de 0% a 100%»", "RF-MOD-GOVERNANCA-05")],
      grid={"Colunas exibidas (em ordem)": "Parâmetro, Valor, Vigência, Alterado por, Data", "Ordenação default": "Parâmetro", "Paginação": "20 por página", "Ações por linha": "Editar; Ver histórico", "Mensagem de lista vazia": "«Nenhuma meta cadastrada para o ciclo»"},
      filtros=None),
 dict(tel="TEL-014", pr="PR-MOD-GOVERNANCA-002", nome="Auditoria", rota="/x_cbi_auditoria_evento_list.do", mod="MOD-GOVERNANCA",
      rfs=["RF-MOD-GOVERNANCA-06", "RF-MOD-GOVERNANCA-01", "RF-MOD-GOVERNANCA-03", "RF-MOD-GOVERNANCA-04"], etp=["ETP-025"], persona="Auditor", prio="Could", f="F-031",
      ctx="O auditor verifica quem fez o quê, inclusive exportações.",
      req="Listar eventos de auditoria, versões publicadas e exportações registradas, só para leitura.",
      crit=["Nenhuma ação de edição ou exclusão aparece para nenhum papel", "Filtrar por usuário e período devolve a primeira página em até 3 segundos"],
      anti="Oferecer exclusão de evento, mesmo para o admin",
      estados={"Carregando": "lista com indicador", "Sucesso": "eventos com usuário, ação e data", "Erro de validação": "—", "Erro de sistema": "«Não foi possível carregar a auditoria. Tente de novo.»", "Vazio": "«Nenhum evento para os filtros»", "Offline": "aviso da instância"},
      campos=[("usuario", "Usuário", "lookup", "Não", "única", "*(dinâmica)*", "domainTable:sys_user", "—", "—", "—", "—", "RF-MOD-GOVERNANCA-06"),
              ("acao", "Ação", "select", "Não", "múltipla", "`PUBLICACAO` — Publicação; `CONFIRMACAO` — Confirmação; `INTERACAO` — Interação; `ALTERACAO_PARAMETRO` — Alteração de parâmetro; `EXPORTACAO` — Exportação; `OUTRO` — Outro", "enum:AcaoAuditoria", "—", "todas", "—", "—", "RF-MOD-GOVERNANCA-04"),
              ("periodo", "Período", "daterange", "Não", "—", "—", "—", "DD/MM/AAAA", "últimos 30 dias", "máx. 12 meses", "intervalo acima de 12 meses → «Escolha no máximo 12 meses»", "RF-MOD-GOVERNANCA-06")],
      grid={"Colunas exibidas (em ordem)": "Data e hora, Usuário, Ação, Registro afetado", "Ordenação default": "Data, mais recente primeiro", "Paginação": "50 por página", "Ações por linha": "Abrir evento (leitura)", "Mensagem de lista vazia": "«Nenhum evento para os filtros»"},
      filtros={"Aplica": "ao acionar o botão «Aplicar»", "Combinação entre filtros": "AND", "Limpar todos de uma vez": "sim", "Persistência do filtro": "nenhuma", "Dependências entre filtros": "—"}),
]

AMARRACAO = {'TEL-001': 'Fonte, LoteCarga, RegistroRejeitado', 'TEL-002': 'PosicaoTributo, Contribuinte', 'TEL-003': 'Contribuinte, Debito, Parcelamento, Comunicacao, Sinalizacao', 'TEL-004': 'CriterioVersao', 'TEL-005': 'Carteira, CarteiraItem', 'TEL-006': 'Score, ScoreFaixa, LoteCarga', 'TEL-007': 'Regua, ReguaEtapa, ModeloMensagem', 'TEL-008': 'Comunicacao, Regua, Consentimento', 'TEL-009': 'Caso', 'TEL-010': 'Caso, Interacao, Followup, Debito, Parcelamento, Sinalizacao, VinculoEconomico', 'TEL-011': 'Regularizacao', 'TEL-012': 'CarteiraItem, Regularizacao, Comunicacao, Meta', 'TEL-013': 'Parametro, ScoreFaixa, Meta', 'TEL-014': 'EventoAuditoria, CriterioVersao'}

COBERTURA_TELAS = [(t["nome"], t["rfs"]) for t in TELAS]

FLUXOS = [
 ("FLX-001", "Carga diária e consolidação", "TO-BE", "Gestor de Integração", "Manter a visão única do contribuinte atualizada a cada ciclo"),
 ("FLX-002", "Qualificação da carteira do ciclo", "TO-BE", "Coordenador de Cobrança", "Formar a carteira do ciclo com critérios publicados"),
 ("FLX-003", "Recebimento e uso do score", "TO-BE", "Gestor de Integração", "Receber o score da UFMT e acompanhar a cobertura"),
 ("FLX-004", "Cobrança massificada por régua", "TO-BE", "Coordenador de Cobrança", "Comunicar a carteira massificada sem confirmação manual"),
 ("FLX-005", "Cobrança qualificada", "TO-BE", "Atendente de Cobrança", "Conduzir os casos priorizados até o desfecho"),
 ("FLX-006", "Monitoramento do ciclo", "TO-BE", "Coordenador de Cobrança", "Medir a recuperação e o efeito incremental"),
 ("FLX-007", "Governança e auditoria", "TO-BE", "Administrador da aplicação", "Manter parâmetros e auditar a operação"),
]
# id, fluxo, ordem, nome, ator, tela, entrada, saída
ETAPAS = [
 ("ETP-001", "FLX-001", 1, "Receber lotes das fontes", "Sistema parceiro", "—", "Lote de débitos da fonte", "Registros aceitos e rejeitados"),
 ("ETP-002", "FLX-001", 2, "Validar e consolidar", "Sistema", "—", "Registros aceitos", "Posição por contribuinte e tributo"),
 ("ETP-003", "FLX-001", 3, "Fechar ciclo e acompanhar fontes", "Gestor de Integração", "TEL-001", "Situação das fontes", "Fontes conferidas"),
 ("ETP-004", "FLX-001", 4, "Reprocessar rejeitados", "Gestor de Integração", "TEL-001", "Registros rejeitados", "Registros reprocessados"),
 ("ETP-005", "FLX-001", 5, "Consultar carteira consolidada", "Coordenador de Cobrança", "TEL-002", "Posições consolidadas", "Posições analisadas"),
 ("ETP-006", "FLX-001", 6, "Consultar visão única", "Coordenador de Cobrança", "TEL-003", "Contribuinte", "Contribuinte analisado"),
 ("ETP-007", "FLX-002", 1, "Parametrizar rascunho", "Coordenador de Cobrança", "TEL-004", "Última versão publicada", "Rascunho de critérios"),
 ("ETP-008", "FLX-002", 2, "Gerar prévia", "Coordenador de Cobrança", "TEL-005", "Rascunho de critérios", "Carteira simulada"),
 ("ETP-009", "FLX-002", 3, "Publicar versão", "Coordenador de Cobrança", "TEL-004", "Rascunho com prévia vigente", "Versão publicada"),
 ("ETP-010", "FLX-002", 4, "Confirmar carteira", "Coordenador de Cobrança", "TEL-005", "Carteira da versão publicada", "Carteira confirmada"),
 ("ETP-011", "FLX-003", 1, "Receber lote de score", "UFMT (sistema)", "—", "Lote de score", "Scores vigentes por contribuinte"),
 ("ETP-012", "FLX-003", 2, "Acompanhar Painel do Score", "Gestor de Integração", "TEL-006", "Scores vigentes", "Cobertura acompanhada"),
 ("ETP-013", "FLX-004", 1, "Montar régua", "Coordenador de Cobrança", "TEL-007", "Segmento", "Régua ativa"),
 ("ETP-014", "FLX-004", 2, "Processar etapas devidas", "Sistema", "—", "Carteira massificada e régua ativa", "Comunicações enviadas"),
 ("ETP-015", "FLX-004", 3, "Acompanhar execução", "Coordenador de Cobrança", "TEL-008", "Comunicações", "Envio conferido"),
 ("ETP-016", "FLX-004", 4, "Encaminhar à qualificada", "Sistema", "—", "Contribuinte com régua esgotada", "Contribuinte encaminhado"),
 ("ETP-017", "FLX-005", 1, "Criar e distribuir casos", "Sistema", "—", "Carteira qualificada ou encaminhamento", "Casos atribuídos"),
 ("ETP-018", "FLX-005", 2, "Trabalhar a fila", "Atendente de Cobrança", "TEL-009", "Casos atribuídos", "Caso escolhido"),
 ("ETP-019", "FLX-005", 3, "Conduzir caso e registrar interação", "Atendente de Cobrança", "TEL-010", "Caso escolhido", "Interação registrada"),
 ("ETP-020", "FLX-005", 4, "Encerrar caso por regularização", "Sistema", "—", "Regularização na carga", "Caso encerrado"),
 ("ETP-021", "FLX-006", 1, "Atribuir origem da regularização", "Sistema", "—", "Regularização registrada", "Regularização com origem"),
 ("ETP-022", "FLX-006", 2, "Acompanhar Painel Institucional", "Coordenador de Cobrança", "TEL-012", "Indicadores do ciclo", "Decisão para o próximo ciclo"),
 ("ETP-023", "FLX-006", 3, "Conferir regularizações", "Coordenador de Cobrança", "TEL-011", "Regularizações com origem", "Regularizações conferidas"),
 ("ETP-024", "FLX-007", 1, "Administrar parâmetros, faixas e metas", "Administrador da aplicação", "TEL-013", "Parâmetros vigentes", "Parâmetros atualizados"),
 ("ETP-025", "FLX-007", 2, "Auditar a operação", "Auditor", "TEL-014", "Eventos de auditoria", "Auditoria concluída"),
]
# id, de, para, gatilho, [rn explore], estado
TRANS = [
 ("TRS-001", "ETP-001", "ETP-002", "Fonte fecha o lote", ["RN-014", "RN-015"], "Lote.ok"),
 ("TRS-002", "ETP-002", "ETP-003", "Horário-limite das fontes vence", ["RN-016"], "Fonte.falha"),
 ("TRS-003", "ETP-003", "ETP-004", "Gestor abre a lista de rejeitados", ["RN-014"], "—"),
 ("TRS-004", "ETP-003", "ETP-005", "Ciclo consolidado", ["RN-001"], "PosicaoTributo.atualizada"),
 ("TRS-005", "ETP-005", "ETP-006", "Coordenador abre um contribuinte", ["RN-028"], "—"),
 ("TRS-006", "ETP-006", "—", "Coordenador fecha o contribuinte", [], "—"),
 ("TRS-007", "ETP-004", "—", "Reprocesso concluído", ["RN-015"], "RegistroRejeitado.reprocessado"),
 ("TRS-008", "ETP-007", "ETP-008", "Coordenador pede a prévia", ["RN-019"], "CriterioVersao.rascunho"),
 ("TRS-009", "ETP-008", "ETP-009", "Coordenador publica com fundamentação", ["RN-021"], "CriterioVersao.publicada"),
 ("TRS-010", "ETP-009", "ETP-010", "Coordenador confirma a carteira", ["RN-020", "RN-009"], "Carteira.confirmada"),
 ("TRS-011", "ETP-010", "—", "Carteira confirmada libera réguas e casos", ["RN-004"], "Carteira.confirmada"),
 ("TRS-012", "ETP-011", "ETP-012", "UFMT fecha o lote de score", ["RN-013"], "Score.vigente"),
 ("TRS-013", "ETP-012", "—", "Gestor encerra a consulta", [], "—"),
 ("TRS-014", "ETP-013", "ETP-014", "Régua ativada", ["RN-022"], "Regua.ativa"),
 ("TRS-015", "ETP-014", "ETP-015", "Processamento diário concluído", ["RN-005", "RN-006"], "Comunicacao.enviada"),
 ("TRS-016", "ETP-015", "ETP-016", "Contribuinte esgota a régua sem regularizar", ["RN-005"], "CarteiraItem.encaminhado"),
 ("TRS-017", "ETP-016", "ETP-017", "Encaminhamento à cobrança qualificada", ["RN-004"], "Caso.novo"),
 ("TRS-018", "ETP-017", "ETP-018", "Caso atribuído ao atendente", ["RN-007"], "Caso.atribuido"),
 ("TRS-019", "ETP-018", "ETP-019", "Atendente abre o caso", ["RN-025", "RN-011"], "—"),
 ("TRS-020", "ETP-019", "ETP-020", "Carga mostra o débito regularizado", ["RN-002"], "Caso.encerrado"),
 ("TRS-021", "ETP-020", "ETP-021", "Regularização registrada", ["RN-008"], "Regularizacao.registrada"),
 ("TRS-022", "ETP-021", "ETP-022", "Coleta diária dos indicadores", ["RN-026", "RN-027"], "—"),
 ("TRS-023", "ETP-022", "ETP-023", "Coordenador detalha as regularizações", ["RN-011"], "—"),
 ("TRS-024", "ETP-023", "—", "Conferência concluída", [], "—"),
 ("TRS-025", "ETP-024", "ETP-025", "Alteração de parâmetro gera evento de auditoria", ["RN-030"], "AuditoriaEvento.gravado"),
 ("TRS-026", "ETP-025", "—", "Auditoria concluída", [], "—"),
 ("TRS-027", "ETP-015", "—", "Régua pausada pelo coordenador", ["RN-024"], "Regua.pausada"),
]


def gerar(OUT, HOJE, RF_NOVO, RN_NOVO, MOD, FMAP):
    estados_txt = "Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline"
    p = [f"""# Requisitos de Produto / UX — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: {HOJE}
Fonte: product-vision.md, requirements/requirements.md, business-rules.md, context-map.md (telas da especificação funcional do Explore e ETF §6.6)

**Âmbito deste arquivo:** PR (experiência, estados de UI, acessibilidade, jornadas). Não há tela
customizada: cada PR descreve uma lista, um formulário nativo do ServiceNow ou um dashboard do
Platform Analytics, limitado por papel (ETF §1.1 e §6.6). O protótipo v3 em `inputs/prototipo/` é
referência visual; não há `prototype.md` (protótipo dispensado, ver isenção em
`outputs/spec/auditorias/_isencoes/`).

**Rastreio obrigatório:** cada PR liga a pelo menos um RF em [`../requirements/requirements.md`](../requirements/requirements.md).

<!-- id: pr-module-index -->

## Índice de módulos (PR)

| Módulo | Objetivo negócio (resumo) | Qtd PR |
|--------|---------------------------|--------|"""]
    for c in MOD:
        n = len([t for t in TELAS if t["mod"] == c])
        p.append(f"| {c} | {MOD[c][4]} | {n} |")
    p.append("""
---

<!-- id: pr-overview -->

## Princípios de experiência

### Princípio: Tudo do contribuinte num lugar só
**Origem:** F-194 — o atendente consulta vários sistemas antes de cada contato
**Descrição:** o formulário do contribuinte e o do caso reúnem débitos, parcelamentos, comunicações, interações e sinalizações em listas relacionadas.
**Como verificar:** nenhum roteiro de atendimento exige abrir outra tela para ver o histórico do contribuinte.

### Princípio: O que importa aparece primeiro
**Origem:** F-195 e F-189 — risco de cobrar quem já pagou e seleção empírica
**Descrição:** listas abrem ordenadas pelo que exige ação (fonte em falha, maior prioridade, maior valor) e mostram a situação atualizada do ciclo.
**Como verificar:** em cada lista, a ordenação default coloca o item que exige ação na primeira linha.

### Princípio: Nada se perde e nada se reescreve
**Origem:** F-196 — histórico disperso; regra de auditoria imutável
**Descrição:** interação, versão publicada, carteira confirmada e evento de auditoria não podem ser editados; correção é um novo registro.
**Como verificar:** nenhum desses registros oferece editar ou excluir para nenhum papel.

### Princípio: Cada papel vê só o que lhe cabe
**Origem:** F-017 e F-158 — matriz de acesso por papel
**Descrição:** a mesma tela mostra conteúdos diferentes por papel; o atendente nunca vê comparativo nem painel.
**Como verificar:** o roteiro por papel não encontra dado fora da matriz.

---

<!-- id: pr-traceability -->

## Rastreabilidade global (PR)

| ID PR | Módulo | RF relacionado *(≥1)* | Legacy / vision | F-xxx |
|-------|--------|----------------------|-----------------|-------|""")
    for t in TELAS:
        p.append(f"| {t['pr']} | {t['mod']} | {', '.join(t['rfs'])} | product-vision.md §5 | {t['f']} |")
    p.append("\n---\n\n<!-- id: pr-section -->\n\n## Requisitos de produto / UX por módulo\n")
    for c in MOD:
        ts = [t for t in TELAS if t["mod"] == c]
        if not ts:
            continue
        p.append(f"## Módulo: {MOD[c][1]} (`{c}`)\n")
        for t in ts:
            p.append(f"### {t['pr']} — {t['nome']}\n")
            p.append(f"**RF relacionado:** {', '.join(t['rfs'])}")
            p.append(f"**Etapa do fluxo:** {', '.join(t['etp'])}\n")
            p.append(f"**Personas:** {t['persona']}")
            p.append(f"**Prioridade:** {t['prio']}")
            p.append("**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)\n")
            p.append(f"**Contexto de uso:** {t['ctx']}\n")
            p.append(f"**Requisito de experiência:** {t['req']}\n")
            p.append("**Critérios mensuráveis:**")
            p += [f"- {x}" for x in t["crit"]]
            p.append(f"\n**Antipadrão (o que evitar):**\n- {t['anti']}\n")
            p.append("**Mapa de estados:**")
            p += [f"- {k}: {v}" for k, v in t["estados"].items()]
            p.append("\n**Inventário de campos**\n")
            p.append("| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |")
            p.append("|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|")
            for f in t["campos"]:
                p.append("| " + " | ".join(f) + " |")
            p.append("\n**Grid / listagem**\n")
            p += [f"- {k}: {v}" for k, v in t["grid"].items()] if t["grid"] else ["—"]
            p.append("\n**Comportamento dos filtros**\n")
            p += [f"- {k}: {v}" for k, v in t["filtros"].items()] if t["filtros"] else ["—"]
            p.append("\n**Gap associado:** —\n\n---\n")
    p.append("""<!-- id: pr-ttfv -->

## Time to First Value (TTFV) por jornada

```
TTFV alvo: 2 minutos para o Atendente abrir o caso de maior prioridade com o dossiê completo
Passos máximos: 2 passos entre o login e o dossiê (Minha Fila → caso)
Pré-requisitos visíveis ao usuário: ter casos atribuídos; sem casos, a fila diz «Você não tem casos abertos»

TTFV alvo: 10 minutos para o Coordenador publicar uma versão de critérios e ver a prévia da carteira
Passos máximos: 4 passos (Critérios → rascunho → prévia → publicar)
Pré-requisitos visíveis ao usuário: carga do ciclo consolidada (data da última carga visível)
```

---

<!-- id: pr-language -->

## Linguagem e tom

```
Idioma principal: português do Brasil
Tom: Profissional
Pessoa do discurso: impessoal nas telas; 2ª pessoa («você») só em mensagens ao usuário

Glossário da interface:
  posição por tributo → Carteira consolidada
  item da carteira → Contribuinte da carteira
  grupo de controle → Grupo de controle (não cobrado)
  opt-in / opt-out → Consentimento (autorizado / retirado)

Termos proibidos na UI: lote técnico, payload, sys_id, ACL, endpoint
```

---

<!-- id: pr-accessibility -->

## Acessibilidade WCAG 2.2

| Nível | Requisito | Como verificar |
|-------|-----------|----------------|
| A | Imagens e ícones de situação com texto alternativo | Axe DevTools |
| A | Navegação por teclado em todas as listas, formulários e painéis | Teste manual |
| AA | Contraste mínimo 4.5:1, inclusive nas cores dos painéis | Colour Contrast Analyser |
| AA | Labels em todos os campos de formulário e filtros | Axe DevTools |
| AA | Foco não encoberto por cabeçalho ou modal | Teste manual |
| AA | Alvo interativo ≥ 24x24px | Axe DevTools |
| AA | Situação nunca indicada só por cor (Falha, Em risco, abaixo da meta têm texto) | Teste manual |

---

<!-- id: pr-journeys -->

## Jornadas por persona
""")
    jornadas = [
        ("Trabalhar o caso de maior prioridade", "Atendente de Cobrança",
         [("1. Entrada", "abre «Minha fila» no menu", "Carregando, Sucesso"), ("2. Ação principal", "abre o caso do topo e lê o dossiê", "Sucesso"), ("3. Confirmação", "registra a interação e vê «Interação registrada»", "Sucesso"), ("4. Erro / recuperação", "data de follow-up no passado é recusada junto ao campo", "Erro de validação"), ("5. Saída / próximo", "volta à fila, já sem o caso se ele foi encerrado", "Sucesso, Vazio")]),
        ("Formar a carteira do ciclo", "Coordenador de Cobrança",
         [("1. Entrada", "abre «Critérios de Qualificação»", "Carregando, Sucesso"), ("2. Ação principal", "ajusta o rascunho e gera a prévia", "Carregando, Sucesso"), ("3. Confirmação", "publica com fundamentação e confirma a carteira", "Sucesso"), ("4. Erro / recuperação", "publicar sem prévia vigente é bloqueado com a orientação", "Erro de validação"), ("5. Saída / próximo", "acompanha a execução das réguas", "Sucesso")]),
        ("Conferir o ciclo de carga", "Gestor de Integração",
         [("1. Entrada", "abre «Integrações & Sincronização»", "Carregando, Sucesso"), ("2. Ação principal", "identifica a fonte em falha no topo", "Sucesso"), ("3. Confirmação", "reprocessa rejeitados e vê o resultado na linha", "Sucesso"), ("4. Erro / recuperação", "reprocesso que falha mostra o motivo", "Erro de validação, Erro de sistema"), ("5. Saída / próximo", "confere o Painel do Score", "Sucesso")]),
    ]
    heur = ["Visibilidade do estado do sistema", "Correspondência sistema ↔ mundo real", "Controle e liberdade do usuário", "Consistência e padrões", "Prevenção de erros", "Reconhecimento em vez de memorização", "Flexibilidade e eficiência de uso", "Estética e design minimalista", "Ajudar a reconhecer, diagnosticar e recuperar de erros", "Ajuda e documentação"]
    notas = ["situação e data da última carga sempre visíveis", "termos do cliente (carteira, régua, caso)", "rascunho pode ser descartado; régua pode ser pausada", "telas nativas do ServiceNow, mesmo padrão em todo o produto", "botões bloqueados até a condição ser atendida", "filtros salvos e listas relacionadas", "filtros salvos por papel", "só as colunas da tarefa do papel", "mensagens de erro com a ação para corrigir", "⚠️ ajuda contextual depende do material de treinamento (operação assistida)"]
    for nome, persona, passos in jornadas:
        p.append(f"### Jornada: {nome} — persona {persona}\n\n**Espinha padronizada (5 passos):**\n\n| Passo | Descrição | Estado(s) de UI envolvido(s) |\n|-------|-----------|------------------------------|")
        p += [f"| {a} | {b} | {c} |" for a, b, c in passos]
        p.append("\n**Checklist das 10 heurísticas de Nielsen (heurística × jornada):**\n\n| # | Heurística | Atende? (✅/⚠️/❌) | Evidência / nota |\n|---|-----------|--------------------|------------------|")
        p += [f"| {i} | {h} | {'⚠️' if i == 10 else '✅'} | {n} |" for i, (h, n) in enumerate(zip(heur, notas), 1)]
        p.append("")
    (OUT / "product-requirements").mkdir(exist_ok=True)
    (OUT / "product-requirements" / "product-requirements.md").write_text("\n".join(p), encoding="utf-8")

    # flow-map
    fm = [f"""# Mapa de Fluxos e Telas — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: {HOJE}
Fonte: discovery-document.md, product-requirements.md, business-rules.md (sem legado: todos os fluxos são TO-BE)

## Fluxos

| ID | Nome | Tipo | Ator principal | Origem (AS-IS) | Objetivo |
|----|------|------|----------------|----------------|----------|"""]
    fm += [f"| {a} | {b} | {c} | {d} | — | {e} |" for a, b, c, d, e in FLUXOS]
    fm.append("\n## Etapas\n\n| ID | Fluxo | Ordem | Nome | Ator | Tela | Entrada | Saída |\n|----|-------|-------|------|------|------|---------|-------|")
    fm += [f"| {a} | {b} | {c} | {d} | {e} | {f} | {g} | {h} |" for a, b, c, d, e, f, g, h in ETAPAS]
    fm.append("\n## Telas\n\n| ID | Nome | Rota | Módulo | Estados UI | RF/PR | Screenshot |\n|----|------|------|--------|------------|-------|------------|")
    for t in TELAS:
        fm.append(f"| {t['tel']} | {t['nome']} | {t['rota']} | {t['mod']} | {estados_txt} | {', '.join(t['rfs'] + [t['pr']])} | — |")
    fm.append("\n## Transições\n\n| ID | De | Para | Gatilho | Regras | Estado da entidade |\n|----|----|------|---------|--------|--------------------|")
    for a, de, para, gat, rns, est in TRANS:
        fm.append(f"| {a} | {de} | {para} | {gat} | {', '.join(RN_NOVO[x] for x in rns) or '—'} | {est} |")
    fm.append("""
## Amarração Técnica

*(Coluna Entidades preenchida pela spec-data-model a partir do `data-model.json`; Endpoints pela spec-api-contracts.)*

| Tela | Entidades | Endpoints |
|------|-----------|-----------|
[AMARRACAO]

## Cobertura

```
[MÉTRICAS]
```

[JUSTIFICATIVAS]
""")
    (OUT / "flow-map.md").write_text("\n".join(fm).replace("[AMARRACAO]", "\n".join(f"| {t} | {e} | — |" for t, e in AMARRACAO.items())), encoding="utf-8")
