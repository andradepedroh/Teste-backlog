# Requisitos de Produto / UX — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: 2026-11-13
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
|--------|---------------------------|--------|
| MOD-INGESTAO | Manter, a cada ciclo diário, a visão única de cada contribuinte com todos os débitos das seis fontes | 3 |
| MOD-QUALIFICACAO | Formar a carteira de cada ciclo por critérios versionados e auditáveis, com grupo de controle sorteado | 2 |
| MOD-SCORE | Usar o score da UFMT para priorizar quem cobrar, sem depender dele para operar | 1 |
| MOD-REGUAS | Comunicar a carteira massificada por e-mail, SMS e WhatsApp sem confirmação manual | 2 |
| MOD-QUALIFICADA | Dar a cada atendente uma fila priorizada de casos com o dossiê completo do contribuinte | 2 |
| MOD-MONITORAMENTO | Medir a recuperação e o efeito incremental da cobrança contra o grupo de controle | 2 |
| MOD-GOVERNANCA | Garantir que cada papel veja só o que lhe cabe e que toda ação relevante fique auditável | 2 |

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
|-------|--------|----------------------|-----------------|-------|
| PR-MOD-INGESTAO-001 | MOD-INGESTAO | RF-MOD-INGESTAO-01, RF-MOD-INGESTAO-02, RF-MOD-INGESTAO-04, RF-MOD-INGESTAO-05, RF-MOD-INGESTAO-06, RF-MOD-INGESTAO-07, RF-MOD-INGESTAO-08, RF-MOD-INGESTAO-11, RF-MOD-INGESTAO-15 | product-vision.md §5 | F-018 |
| PR-MOD-INGESTAO-002 | MOD-INGESTAO | RF-MOD-INGESTAO-14, RF-MOD-INGESTAO-03 | product-vision.md §5 | F-019 |
| PR-MOD-INGESTAO-003 | MOD-INGESTAO | RF-MOD-INGESTAO-13, RF-MOD-INGESTAO-09, RF-MOD-INGESTAO-10, RF-MOD-INGESTAO-12, RF-MOD-GOVERNANCA-03 | product-vision.md §5 | F-020 |
| PR-MOD-QUALIFICACAO-001 | MOD-QUALIFICACAO | RF-MOD-QUALIFICACAO-01, RF-MOD-QUALIFICACAO-02 | product-vision.md §5 | F-021 |
| PR-MOD-QUALIFICACAO-002 | MOD-QUALIFICACAO | RF-MOD-QUALIFICACAO-03, RF-MOD-QUALIFICACAO-04, RF-MOD-QUALIFICACAO-05, RF-MOD-QUALIFICACAO-06, RF-MOD-SCORE-03 | product-vision.md §5 | F-022 |
| PR-MOD-SCORE-001 | MOD-SCORE | RF-MOD-SCORE-04, RF-MOD-SCORE-01, RF-MOD-SCORE-02 | product-vision.md §5 | F-029 |
| PR-MOD-REGUAS-001 | MOD-REGUAS | RF-MOD-REGUAS-01, RF-MOD-REGUAS-08 | product-vision.md §5 | F-023 |
| PR-MOD-REGUAS-002 | MOD-REGUAS | RF-MOD-REGUAS-09, RF-MOD-REGUAS-02, RF-MOD-REGUAS-04, RF-MOD-REGUAS-05, RF-MOD-REGUAS-06, RF-MOD-REGUAS-07, RF-MOD-REGUAS-03 | product-vision.md §5 | F-024 |
| PR-MOD-QUALIFICADA-001 | MOD-QUALIFICADA | RF-MOD-QUALIFICADA-03, RF-MOD-QUALIFICADA-01, RF-MOD-QUALIFICADA-02, RF-MOD-GOVERNANCA-02 | product-vision.md §5 | F-025 |
| PR-MOD-QUALIFICADA-002 | MOD-QUALIFICADA | RF-MOD-QUALIFICADA-04, RF-MOD-QUALIFICADA-05, RF-MOD-QUALIFICADA-06, RF-MOD-QUALIFICADA-07 | product-vision.md §5 | F-026 |
| PR-MOD-MONITORAMENTO-001 | MOD-MONITORAMENTO | RF-MOD-MONITORAMENTO-08, RF-MOD-MONITORAMENTO-01, RF-MOD-MONITORAMENTO-02 | product-vision.md §5 | F-027 |
| PR-MOD-MONITORAMENTO-002 | MOD-MONITORAMENTO | RF-MOD-MONITORAMENTO-07, RF-MOD-MONITORAMENTO-03, RF-MOD-MONITORAMENTO-04, RF-MOD-MONITORAMENTO-05, RF-MOD-MONITORAMENTO-06 | product-vision.md §5 | F-028 |
| PR-MOD-GOVERNANCA-001 | MOD-GOVERNANCA | RF-MOD-GOVERNANCA-05, RF-MOD-GOVERNANCA-04, RF-MOD-SCORE-02 | product-vision.md §5 | F-030 |
| PR-MOD-GOVERNANCA-002 | MOD-GOVERNANCA | RF-MOD-GOVERNANCA-06, RF-MOD-GOVERNANCA-01, RF-MOD-GOVERNANCA-03, RF-MOD-GOVERNANCA-04 | product-vision.md §5 | F-031 |

---

<!-- id: pr-section -->

## Requisitos de produto / UX por módulo

## Módulo: Ingestão e Carteira Consolidada (`MOD-INGESTAO`)

### PR-MOD-INGESTAO-001 — Integrações & Sincronização

**RF relacionado:** RF-MOD-INGESTAO-01, RF-MOD-INGESTAO-02, RF-MOD-INGESTAO-04, RF-MOD-INGESTAO-05, RF-MOD-INGESTAO-06, RF-MOD-INGESTAO-07, RF-MOD-INGESTAO-08, RF-MOD-INGESTAO-11, RF-MOD-INGESTAO-15
**Etapa do fluxo:** ETP-003, ETP-004

**Personas:** Gestor de Integração
**Prioridade:** Must
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** Todo dia, depois do horário-limite das fontes, o gestor confere quem entregou e trata as rejeições.

**Requisito de experiência:** Mostrar numa lista única a situação de cada fonte, o último lote e os registros rejeitados, com reprocesso a partir da própria lista.

**Critérios mensuráveis:**
- A fonte em Falha aparece no topo, com destaque, sem rolar a página
- O reprocesso de um registro mostra o resultado na mesma linha em até 5 segundos

**Antipadrão (o que evitar):**
- Obrigar o gestor a abrir cada lote para descobrir se houve rejeição

**Mapa de estados:**
- Carregando: lista com indicador de carregamento
- Sucesso: fontes com situação e hora da última carga
- Erro de validação: reprocesso recusado mostra o motivo na linha
- Erro de sistema: mensagem «Não foi possível carregar as fontes. Tente de novo.»
- Vazio: «Nenhuma fonte cadastrada»
- Offline: aviso da instância de que a conexão caiu; nada é gravado

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| fonte | Fonte | select | Não | múltipla | `CCF` — CCF; `MPI` — MPI; `BIG_DATA` — Big Data; `IPVA` — IPVA; `ITCD` — ITCD; `SNE_DTE` — SNE/DT-e; `SCORE_UFMT` — Score UFMT | static | — | todas | — | — | RF-MOD-INGESTAO-05 |
| statusFonte | Situação da fonte | select | Não | múltipla | `OK` — OK; `EM_TRANSICAO` — Em transição; `FALHA` — Falha | enum:StatusFonte | — | — | — | — | RF-MOD-INGESTAO-05 |
| statusLote | Situação do lote | select | Não | múltipla | `EM_ANDAMENTO` — Em andamento; `OK` — OK; `PARCIAL` — Parcial; `FALHA` — Falha | enum:StatusLote | — | — | — | — | RF-MOD-INGESTAO-01 |
| dataLote | Data do lote | daterange | Não | — | — | — | DD/MM/AAAA | últimos 7 dias | máx. 90 dias | intervalo acima de 90 dias → «Escolha no máximo 90 dias» | RF-MOD-INGESTAO-05 |
| motivoRejeicao | Motivo da rejeição | select | Não | múltipla | `DOC_INVALIDO` — CPF/CNPJ inválido; `CAMPO_AUSENTE` — Campo obrigatório ausente; `CONTRIB_NAO_ENCONTRADO` — Contribuinte não encontrado; `FORMATO_INVALIDO` — Formato inválido; `OUTRO` — Outro | enum:MotivoRejeicao | — | — | — | — | RF-MOD-INGESTAO-02 |
| pctMigracao | % de migração MPI | readonly | Não | — | — | — | 0% | — | 0 a 100% | — | RF-MOD-INGESTAO-11 |

**Grid / listagem**

- Colunas exibidas (em ordem): Fonte, Situação, Última carga (DD/MM/AAAA hh:mm), Lidos, Aceitos, Rejeitados, % de migração
- Ordenação default: Situação (Falha primeiro), depois Fonte
- Paginação: 20 por página
- Ações por linha: Ver lotes; Ver rejeitados; Reprocessar (na lista de rejeitados)
- Mensagem de lista vazia: «Nenhuma fonte cadastrada»

**Comportamento dos filtros**

- Aplica: ao alterar o campo
- Combinação entre filtros: AND
- Limpar todos de uma vez: sim
- Persistência do filtro: filtro salvo da lista
- Dependências entre filtros: Motivo da rejeição só se aplica à lista de rejeitados

**Gap associado:** —

---

### PR-MOD-INGESTAO-002 — Carteira Consolidada

**RF relacionado:** RF-MOD-INGESTAO-14, RF-MOD-INGESTAO-03
**Etapa do fluxo:** ETP-005

**Personas:** Coordenador de Cobrança
**Prioridade:** Should
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O coordenador analisa a base antes de definir os critérios do ciclo.

**Requisito de experiência:** Listar a posição contribuinte × tributo com filtros salvos por tributo, atraso, valor e situação.

**Critérios mensuráveis:**
- Filtrar 1,8 milhão de posições por tributo e atraso devolve a primeira página em até 3 segundos
- O total de posições filtradas aparece acima da lista

**Antipadrão (o que evitar):**
- Exibir a lista sem total nem filtro salvo, obrigando a remontar o filtro a cada ciclo

**Mapa de estados:**
- Carregando: lista com indicador de carregamento
- Sucesso: posições com valor, atraso e situação
- Erro de validação: valor mínimo maior que o máximo → mensagem no filtro
- Erro de sistema: «Não foi possível carregar a carteira. Tente de novo.»
- Vazio: «Nenhuma posição encontrada para os filtros»
- Offline: aviso da instância; nada é gravado

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| tributo | Tributo | select | Não | múltipla | `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST; `IPVA` — IPVA; `ITCD` — ITCD | enum:Tributo | — | todos | — | — | RF-MOD-INGESTAO-14 |
| atrasoMin | Atraso mínimo (dias) | number | Não | — | — | — | inteiro | — | 0 a 9999 | negativo → «Informe zero ou mais dias» | RF-MOD-INGESTAO-14 |
| valorMin | Valor mínimo em aberto | currency | Não | — | — | — | R$ 0,00 | — | ≥ 0 | maior que o valor máximo → «O mínimo não pode passar do máximo» | RF-MOD-INGESTAO-14 |
| valorMax | Valor máximo em aberto | currency | Não | — | — | — | R$ 0,00 | — | ≥ 0 | — | RF-MOD-INGESTAO-14 |
| statusCobranca | Situação da cobrança | select | Não | múltipla | `NOTIFICADO` — Notificado; `EM_COBRANCA` — Em cobrança; `REGULARIZADO` — Regularizado | enum:StatusCobrancaTributo | — | — | — | — | RF-MOD-INGESTAO-14 |
| statusParcelamento | Parcelamento | select | Não | múltipla | `SEM_PARCELAMENTO` — Sem parcelamento; `ATIVO` — Ativo; `EM_RISCO` — Em risco | enum:StatusParcelamentoPosicao | — | — | — | — | RF-MOD-INGESTAO-10 |

**Grid / listagem**

- Colunas exibidas (em ordem): Contribuinte (nome), Documento (CPF mascarado), Tributo, Total em aberto, Maior atraso (dias), Qtd. débitos, Parcelamento, Situação da cobrança
- Ordenação default: Total em aberto, do maior para o menor
- Paginação: 50 por página
- Ações por linha: Abrir contribuinte
- Mensagem de lista vazia: «Nenhuma posição encontrada para os filtros»

**Comportamento dos filtros**

- Aplica: ao acionar o botão «Aplicar»
- Combinação entre filtros: AND
- Limpar todos de uma vez: sim
- Persistência do filtro: filtro salvo da lista
- Dependências entre filtros: —

**Gap associado:** —

---

### PR-MOD-INGESTAO-003 — Visão Única do Contribuinte

**RF relacionado:** RF-MOD-INGESTAO-13, RF-MOD-INGESTAO-09, RF-MOD-INGESTAO-10, RF-MOD-INGESTAO-12, RF-MOD-GOVERNANCA-03
**Etapa do fluxo:** ETP-006

**Personas:** Coordenador de Cobrança
**Prioridade:** Must
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O coordenador ou o atendente precisa ver tudo de um contribuinte antes de decidir ou contatar.

**Requisito de experiência:** Reunir no formulário do contribuinte os débitos, parcelamentos, comunicações e sinalizações, com o CPF mascarado.

**Critérios mensuráveis:**
- Todas as listas relacionadas aparecem no mesmo formulário, sem abrir outra tela
- Parcelamento em risco aparece destacado na lista

**Antipadrão (o que evitar):**
- Mostrar o CPF completo por padrão

**Mapa de estados:**
- Carregando: formulário com indicador de carregamento
- Sucesso: cabeçalho do contribuinte e listas relacionadas
- Erro de validação: — (formulário só de leitura; dados gravados pela carga)
- Erro de sistema: «Não foi possível abrir o contribuinte. Tente de novo.»
- Vazio: lista relacionada sem registro mostra «Nenhum registro»
- Offline: aviso da instância

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| documento | CPF/CNPJ | readonly | Sim | — | — | — | CPF mascarado: ***.***.***-NN; CNPJ completo | — | 14 dígitos | — | RF-MOD-GOVERNANCA-03 |
| tipo | Tipo de pessoa | readonly | Sim | única | `PF` — Pessoa física; `PJ` — Pessoa jurídica | enum:TipoPessoa | — | — | — | — | RF-MOD-INGESTAO-13 |
| nome | Nome ou razão social | readonly | Sim | — | — | — | — | — | 150 caracteres | — | RF-MOD-INGESTAO-13 |
| segmentoAtual | Segmento no ciclo | readonly | Não | única | `MASSIFICADA` — Massificada; `QUALIFICADA` — Qualificada; `SEM_CARTEIRA` — Sem carteira | enum:SegmentoContribuinte | — | — | — | — | RF-MOD-INGESTAO-13 |
| statusCobranca | Situação da cobrança | readonly | Sim | única | `SEM_ACAO` — Sem ação; `NOTIFICADO` — Notificado; `EM_COBRANCA` — Em cobrança; `REGULARIZADO` — Regularizado | enum:StatusCobranca | — | — | — | — | RF-MOD-INGESTAO-09 |
| totalEmAberto | Total em aberto | readonly | Não | — | — | — | R$ 0,00 | — | — | — | RF-MOD-INGESTAO-13 |
| contumaz | Devedor contumaz | readonly | Não | — | — | — | Sim/Não | — | — | — | RF-MOD-INGESTAO-13 |

**Grid / listagem**

- Colunas exibidas (em ordem): Débitos: Tributo, Valor, Vencimento, Instrumento, Fonte, Situação · Parcelamentos: Número, Tributo, Parcelas em atraso, Situação · Comunicações: Data, Canal, Régua, Situação · Sinalizações: Tipo, Data, Ativa
- Ordenação default: mais recente primeiro em cada lista
- Paginação: 10 por lista relacionada
- Ações por linha: nenhuma (somente leitura)
- Mensagem de lista vazia: «Nenhum registro»

**Comportamento dos filtros**

—

**Gap associado:** —

---

## Módulo: Qualificação e Parametrização da Carteira (`MOD-QUALIFICACAO`)

### PR-MOD-QUALIFICACAO-001 — Critérios de Qualificação

**RF relacionado:** RF-MOD-QUALIFICACAO-01, RF-MOD-QUALIFICACAO-02
**Etapa do fluxo:** ETP-007, ETP-009

**Personas:** Coordenador de Cobrança
**Prioridade:** Must
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** A cada ciclo, o coordenador revisa os critérios e publica uma versão.

**Requisito de experiência:** Editar o rascunho de critérios e publicar com fundamentação, mostrando o histórico de versões.

**Critérios mensuráveis:**
- O botão «Publicar» só fica habilitado com prévia vigente e fundamentação preenchida
- A versão publicada aparece como somente leitura

**Antipadrão (o que evitar):**
- Permitir publicar sem prévia ou editar versão publicada

**Mapa de estados:**
- Carregando: formulário com indicador
- Sucesso: «Versão N publicada»
- Erro de validação: mensagem junto ao campo inválido
- Erro de sistema: «Não foi possível salvar. Tente de novo.»
- Vazio: sem versão publicada: «Nenhuma versão publicada ainda»
- Offline: aviso da instância; rascunho não é salvo

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| tributos | Tributos | multiselect | Sim | múltipla | `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST; `IPVA` — IPVA; `ITCD` — ITCD | enum:Tributo | — | — | ≥ 1 | nenhum → «Escolha ao menos um tributo» | RF-MOD-QUALIFICACAO-01 |
| valorMin | Valor mínimo em aberto | currency | Sim | — | — | — | R$ 0,00 | R$ 0,00 | ≥ 0 | negativo → «O valor mínimo deve ser zero ou maior» | RF-MOD-QUALIFICACAO-01 |
| atrasoMin | Atraso mínimo (dias) | number | Sim | — | — | — | inteiro | 0 | 0 a 9999 | negativo → «Informe zero ou mais dias» | RF-MOD-QUALIFICACAO-01 |
| instrumentos | Instrumentos | multiselect | Não | múltipla | `AUTO_INFRACAO` — Auto de infração; `DECLARACAO` — Declaração; `OUTRO` — Outro | enum:Instrumento | — | todos | — | — | RF-MOD-QUALIFICACAO-01 |
| excluirContumazes | Excluir contumazes | toggle | Não | — | — | — | — | Sim | — | — | RF-MOD-QUALIFICACAO-01 |
| limiteScore | Score mínimo (só para quem tem score) | number | Não | — | — | — | 0,00 | vazio | 0 a 1 | fora de 0 a 1 → «Informe um valor entre 0 e 1» | RF-MOD-QUALIFICACAO-01 |
| tipoAlvo | Segmento-alvo | select | Sim | única | `MASSIFICADA` — Massificada; `QUALIFICADA` — Qualificada | enum:SegmentoAlvo | — | — | — | vazio → «Escolha o segmento-alvo» | RF-MOD-QUALIFICACAO-01 |
| fundamentacao | Fundamentação | textarea | Sim (para publicar) | — | — | — | — | — | até 2000 caracteres | vazio ao publicar → «Informe a fundamentação para publicar» | RF-MOD-QUALIFICACAO-02 |

**Grid / listagem**

- Colunas exibidas (em ordem): Versão, Estado (Rascunho/Publicada), Publicada por, Data de publicação
- Ordenação default: Versão, da maior para a menor
- Paginação: 20 por página
- Ações por linha: Abrir; Criar rascunho a partir desta
- Mensagem de lista vazia: «Nenhuma versão publicada ainda»

**Comportamento dos filtros**

—

**Gap associado:** —

---

### PR-MOD-QUALIFICACAO-002 — Prévia da Carteira Segmentada

**RF relacionado:** RF-MOD-QUALIFICACAO-03, RF-MOD-QUALIFICACAO-04, RF-MOD-QUALIFICACAO-05, RF-MOD-QUALIFICACAO-06, RF-MOD-SCORE-03
**Etapa do fluxo:** ETP-008, ETP-010

**Personas:** Coordenador de Cobrança
**Prioridade:** Must
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** Antes de publicar e confirmar, o coordenador confere o tamanho e a composição da carteira.

**Requisito de experiência:** Mostrar os itens da carteira simulada por segmento e grupo de controle, com o botão de confirmação.

**Critérios mensuráveis:**
- Os totais por segmento e de grupo de controle aparecem acima da lista
- «Confirmar carteira» só aparece com versão publicada

**Antipadrão (o que evitar):**
- Confirmar a carteira sem mostrar o tamanho do grupo de controle

**Mapa de estados:**
- Carregando: «Gerando a prévia…» com indicador
- Sucesso: totais e lista de itens
- Erro de validação: confirmação com rascunho → «Só é possível confirmar com versão publicada»
- Erro de sistema: «Não foi possível gerar a prévia. Tente de novo.»
- Vazio: «Nenhum contribuinte atende aos critérios»
- Offline: aviso da instância

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| segmento | Segmento | select | Não | múltipla | `MASSIFICADA` — Massificada; `QUALIFICADA` — Qualificada | enum:SegmentoAlvo | — | todos | — | — | RF-MOD-QUALIFICACAO-04 |
| controle | Grupo de controle | select | Não | única | `SIM` — Só controle; `NAO` — Só cobrada; `TODOS` — Todos | static | — | TODOS | — | — | RF-MOD-QUALIFICACAO-05 |
| tributo | Tributo | select | Não | múltipla | `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST; `IPVA` — IPVA; `ITCD` — ITCD | enum:Tributo | — | todos | — | — | RF-MOD-QUALIFICACAO-03 |
| comScore | Score | select | Não | única | `COM` — Com score; `SEM` — Sem score; `TODOS` — Todos | static | — | TODOS | — | — | RF-MOD-SCORE-03 |

**Grid / listagem**

- Colunas exibidas (em ordem): Contribuinte, Tributo, Total em aberto, Maior atraso, Score (ou «Sem score»), Segmento, Controle
- Ordenação default: Total em aberto, do maior para o menor
- Paginação: 50 por página
- Ações por linha: Abrir contribuinte
- Mensagem de lista vazia: «Nenhum contribuinte atende aos critérios»

**Comportamento dos filtros**

- Aplica: ao alterar o campo
- Combinação entre filtros: AND
- Limpar todos de uma vez: sim
- Persistência do filtro: nenhuma
- Dependências entre filtros: —

**Gap associado:** —

---

## Módulo: Scoring de Liquidez (`MOD-SCORE`)

### PR-MOD-SCORE-001 — Painel do Score de Liquidez

**RF relacionado:** RF-MOD-SCORE-04, RF-MOD-SCORE-01, RF-MOD-SCORE-02
**Etapa do fluxo:** ETP-012

**Personas:** Gestor de Integração
**Prioridade:** Should
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O gestor e o coordenador acompanham se o score chega e cobre a carteira.

**Requisito de experiência:** Mostrar cobertura por tributo, score médio, distribuição por faixa e últimos lotes, com filtro de ciclo e tributo.

**Critérios mensuráveis:**
- Os quatro indicadores aparecem sem rolar a página em tela de 1366 × 768
- Cada visualização mostra a data da última coleta

**Antipadrão (o que evitar):**
- Mostrar média de score sem a cobertura, escondendo que a maioria não tem score

**Mapa de estados:**
- Carregando: visualizações com indicador
- Sucesso: indicadores do ciclo
- Erro de validação: —
- Erro de sistema: «Não foi possível carregar o painel. Tente de novo.»
- Vazio: «Nenhum lote de score recebido»
- Offline: aviso da instância

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| ciclo | Ciclo | month | Não | única | *(dinâmica)* | endpoint:ciclos coletados no Platform Analytics | MM/AAAA | ciclo atual | — | — | RF-MOD-SCORE-04 |
| tributo | Tributo | select | Não | múltipla | `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST; `IPVA` — IPVA; `ITCD` — ITCD | enum:Tributo | — | todos | — | — | RF-MOD-SCORE-04 |

**Grid / listagem**

- Colunas exibidas (em ordem): Últimos lotes: Data, Versão do modelo, Lidos, Aceitos, Rejeitados
- Ordenação default: Data, mais recente primeiro
- Paginação: 10 últimos lotes
- Ações por linha: nenhuma
- Mensagem de lista vazia: «Nenhum lote de score recebido»

**Comportamento dos filtros**

- Aplica: ao alterar o campo
- Combinação entre filtros: AND
- Limpar todos de uma vez: sim
- Persistência do filtro: sessão
- Dependências entre filtros: —

**Gap associado:** —

---

## Módulo: Réguas de Cobrança Massificada (`MOD-REGUAS`)

### PR-MOD-REGUAS-001 — Editor de Régua

**RF relacionado:** RF-MOD-REGUAS-01, RF-MOD-REGUAS-08
**Etapa do fluxo:** ETP-013

**Personas:** Coordenador de Cobrança
**Prioridade:** Must
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O coordenador monta e ajusta a régua de cada segmento.

**Requisito de experiência:** Cadastrar a régua com etapas ordenadas por prazo, canal e modelo, e pausar ou retomar a régua.

**Critérios mensuráveis:**
- As etapas aparecem sempre ordenadas pelo prazo
- Ao pausar, o sistema pede confirmação e informa que o enviado não é cancelado

**Antipadrão (o que evitar):**
- Permitir duas réguas ativas para o mesmo segmento

**Mapa de estados:**
- Carregando: formulário com indicador
- Sucesso: «Régua salva»
- Erro de validação: etapa duplicada → «Já existe etapa neste prazo e canal»
- Erro de sistema: «Não foi possível salvar a régua. Tente de novo.»
- Vazio: régua sem etapa: «Adicione a primeira etapa»
- Offline: aviso da instância; nada é salvo

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| nome | Nome da régua | text | Sim | — | — | — | — | — | até 80 caracteres | vazio → «Informe o nome da régua» | RF-MOD-REGUAS-01 |
| segmento | Segmento | select | Sim | única | `PARCELAMENTOS_INADIMPLENTES` — Parcelamentos inadimplentes; `IPVA` — IPVA; `ITCD` — ITCD; `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST | enum:SegmentoRegua | — | — | — | segmento com régua ativa → «Já existe régua ativa para este segmento» | RF-MOD-REGUAS-01 |
| estado | Estado | select | Sim | única | `RASCUNHO` — Rascunho; `ATIVA` — Ativa; `PAUSADA` — Pausada | enum:EstadoRegua | — | RASCUNHO | — | — | RF-MOD-REGUAS-08 |
| etapaOffset | Prazo da etapa (dias) | number | Sim | — | — | — | inteiro | — | 0 a 365 | fora de 0 a 365 → «Informe de 0 a 365 dias» | RF-MOD-REGUAS-01 |
| etapaCanal | Canal da etapa | select | Sim | única | `EMAIL` — E-mail; `SMS` — SMS; `WHATSAPP` — WhatsApp | enum:Canal | — | — | — | — | RF-MOD-REGUAS-01 |
| etapaModelo | Modelo de mensagem | lookup | Sim | única | *(dinâmica)* | domainTable:x_cbi_template (filtrado pelo canal) | — | — | — | modelo de outro canal → «Escolha um modelo do mesmo canal» | RF-MOD-REGUAS-01 |

**Grid / listagem**

- Colunas exibidas (em ordem): Etapas: Prazo (dias), Canal, Modelo
- Ordenação default: Prazo, crescente
- Paginação: sem paginação
- Ações por linha: Editar; Remover (só em rascunho)
- Mensagem de lista vazia: «Adicione a primeira etapa»

**Comportamento dos filtros**

—

**Gap associado:** —

---

### PR-MOD-REGUAS-002 — Execução & Status de Disparo

**RF relacionado:** RF-MOD-REGUAS-09, RF-MOD-REGUAS-02, RF-MOD-REGUAS-04, RF-MOD-REGUAS-05, RF-MOD-REGUAS-06, RF-MOD-REGUAS-07, RF-MOD-REGUAS-03
**Etapa do fluxo:** ETP-015

**Personas:** Coordenador de Cobrança
**Prioridade:** Should
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O coordenador confere o envio do dia e as falhas.

**Requisito de experiência:** Listar as comunicações por régua, canal e situação, com filtros.

**Critérios mensuráveis:**
- O total por situação aparece acima da lista
- Comunicação em «Falha definitiva» aparece destacada

**Antipadrão (o que evitar):**
- Esconder as comunicações não enviadas por falta de consentimento

**Mapa de estados:**
- Carregando: lista com indicador
- Sucesso: comunicações com situação
- Erro de validação: —
- Erro de sistema: «Não foi possível carregar as comunicações. Tente de novo.»
- Vazio: «Nenhuma comunicação para esta régua»
- Offline: aviso da instância

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| regua | Régua | lookup | Não | múltipla | *(dinâmica)* | domainTable:x_cbi_regua | — | todas | — | — | RF-MOD-REGUAS-09 |
| canal | Canal | select | Não | múltipla | `EMAIL` — E-mail; `SMS` — SMS; `WHATSAPP` — WhatsApp | enum:Canal | — | todos | — | — | RF-MOD-REGUAS-09 |
| situacao | Situação | select | Não | múltipla | `PENDENTE` — Pendente; `ENVIADO` — Enviado; `ENTREGUE` — Entregue; `LIDO` — Lido; `FALHA` — Falha; `FALHA_DEFINITIVA` — Falha definitiva; `SEM_OPT_IN` — Sem opt-in | enum:StatusComunicacao | — | todas | — | — | RF-MOD-REGUAS-06 |
| data | Data de envio | daterange | Não | — | — | — | DD/MM/AAAA | hoje | máx. 31 dias | intervalo acima de 31 dias → «Escolha no máximo 31 dias» | RF-MOD-REGUAS-09 |

**Grid / listagem**

- Colunas exibidas (em ordem): Data, Contribuinte, Régua, Etapa, Canal, Situação, Tentativas
- Ordenação default: Data, mais recente primeiro
- Paginação: 50 por página
- Ações por linha: Abrir comunicação
- Mensagem de lista vazia: «Nenhuma comunicação para esta régua»

**Comportamento dos filtros**

- Aplica: ao alterar o campo
- Combinação entre filtros: AND
- Limpar todos de uma vez: sim
- Persistência do filtro: filtro salvo da lista
- Dependências entre filtros: —

**Gap associado:** —

---

## Módulo: Cobrança Qualificada (`MOD-QUALIFICADA`)

### PR-MOD-QUALIFICADA-001 — Minha Fila

**RF relacionado:** RF-MOD-QUALIFICADA-03, RF-MOD-QUALIFICADA-01, RF-MOD-QUALIFICADA-02, RF-MOD-GOVERNANCA-02
**Etapa do fluxo:** ETP-018

**Personas:** Atendente de Cobrança
**Prioridade:** Must
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O atendente começa o dia pela própria fila.

**Requisito de experiência:** Mostrar só os casos do atendente, ordenados por prioridade.

**Critérios mensuráveis:**
- A fila abre direto ordenada por prioridade, sem filtro manual
- Nenhum caso de outro atendente aparece

**Antipadrão (o que evitar):**
- Mostrar comparativo com outros atendentes

**Mapa de estados:**
- Carregando: lista com indicador
- Sucesso: casos ordenados por prioridade
- Erro de validação: —
- Erro de sistema: «Não foi possível carregar sua fila. Tente de novo.»
- Vazio: «Você não tem casos abertos»
- Offline: aviso da instância

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| estagio | Estágio | select | Não | múltipla | `NOVO` — Novo; `PRIMEIRO_CONTATO` — 1º contato; `NEGOCIACAO` — Negociação; `FOLLOW_UP` — Follow-up | enum:EstagioCaso | — | todos (casos abertos) | — | — | RF-MOD-QUALIFICADA-03 |
| tributo | Tributo | select | Não | múltipla | `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST; `IPVA` — IPVA; `ITCD` — ITCD | enum:Tributo | — | todos | — | — | RF-MOD-QUALIFICADA-03 |

**Grid / listagem**

- Colunas exibidas (em ordem): Prioridade, Número do caso (CQ-AAAA-NNNN), Contribuinte, Total em aberto, Maior atraso, Próximo follow-up, Estágio
- Ordenação default: Prioridade, da maior para a menor
- Paginação: 25 por página
- Ações por linha: Abrir caso
- Mensagem de lista vazia: «Você não tem casos abertos»

**Comportamento dos filtros**

- Aplica: ao alterar o campo
- Combinação entre filtros: AND
- Limpar todos de uma vez: sim
- Persistência do filtro: sessão
- Dependências entre filtros: —

**Gap associado:** —

---

### PR-MOD-QUALIFICADA-002 — Dossiê & Caso

**RF relacionado:** RF-MOD-QUALIFICADA-04, RF-MOD-QUALIFICADA-05, RF-MOD-QUALIFICADA-06, RF-MOD-QUALIFICADA-07
**Etapa do fluxo:** ETP-019

**Personas:** Atendente de Cobrança
**Prioridade:** Must
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O atendente prepara e registra cada contato com o contribuinte.

**Requisito de experiência:** Reunir no caso o dossiê do contribuinte e permitir registrar interações e follow-ups.

**Critérios mensuráveis:**
- A interação salva aparece na lista sem recarregar a página
- Interação salva não tem botão de editar nem excluir

**Antipadrão (o que evitar):**
- Permitir editar interação já registrada

**Mapa de estados:**
- Carregando: formulário com indicador
- Sucesso: «Interação registrada»
- Erro de validação: follow-up no passado → «A data do follow-up deve ser hoje ou futura»
- Erro de sistema: «Não foi possível salvar. Tente de novo.»
- Vazio: lista sem registro mostra «Nenhum registro»
- Offline: aviso da instância; nada é salvo

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| interacaoTipo | Tipo de contato | select | Sim | única | `LIGACAO` — Ligação; `EMAIL` — E-mail; `REUNIAO` — Reunião; `WHATSAPP` — WhatsApp (`SISTEMA` — Sistema é só para eventos automáticos, não aparece para o atendente) | enum:TipoInteracao | — | — | — | vazio → «Escolha o tipo de contato» | RF-MOD-QUALIFICADA-05 |
| interacaoResultado | Resultado | select | Sim | única | `NEGOCIACAO_EM_CURSO` — Negociação em curso; `SEM_CONTATO` — Sem contato; `PROMESSA_PAGAMENTO` — Promessa de pagamento; `RECUSA` — Recusa | enum:ResultadoInteracao | — | — | — | vazio → «Escolha o resultado» | RF-MOD-QUALIFICADA-05 |
| interacaoDescricao | Descrição | textarea | Sim | — | — | — | — | — | até 2000 caracteres | vazio → «Descreva o contato» | RF-MOD-QUALIFICADA-05 |
| followupData | Data do follow-up | date | Não | — | — | — | DD/MM/AAAA | — | hoje ou futura | passado → «A data do follow-up deve ser hoje ou futura» | RF-MOD-QUALIFICADA-06 |
| atribuidoA | Atendente | lookup | Sim | única | *(dinâmica)* | domainTable:sys_user (papel atendente) | — | atendente atual | — | só o coordenador altera | RF-MOD-QUALIFICADA-07 |

**Grid / listagem**

- Colunas exibidas (em ordem): Débitos; Parcelamentos; Interações (Data, Autor, Tipo, Resultado); Follow-ups; Sinalizações; Vínculos econômicos
- Ordenação default: mais recente primeiro
- Paginação: 10 por lista relacionada
- Ações por linha: Interações: nenhuma (imutáveis)
- Mensagem de lista vazia: «Nenhum registro»

**Comportamento dos filtros**

—

**Gap associado:** —

---

## Módulo: Monitoramento e KPIs (`MOD-MONITORAMENTO`)

### PR-MOD-MONITORAMENTO-001 — Regularizações & Origem

**RF relacionado:** RF-MOD-MONITORAMENTO-08, RF-MOD-MONITORAMENTO-01, RF-MOD-MONITORAMENTO-02
**Etapa do fluxo:** ETP-023

**Personas:** Coordenador de Cobrança
**Prioridade:** Should
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O coordenador confere de onde vieram as regularizações do ciclo.

**Requisito de experiência:** Listar as regularizações com filtros por origem, canal, instrumento e tributo.

**Critérios mensuráveis:**
- O total de valor regularizado por origem aparece acima da lista
- A exportação pede confirmação e fica registrada

**Antipadrão (o que evitar):**
- Misturar regularizações do grupo de controle com as da carteira cobrada sem identificar

**Mapa de estados:**
- Carregando: lista com indicador
- Sucesso: regularizações com origem
- Erro de validação: —
- Erro de sistema: «Não foi possível carregar as regularizações. Tente de novo.»
- Vazio: «Nenhuma regularização para os filtros»
- Offline: aviso da instância

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| origem | Origem | select | Não | múltipla | `ESPONTANEA` — Espontânea; `RESPOSTA_COBRANCA` — Resposta à cobrança | enum:OrigemRegularizacao | — | todas | — | — | RF-MOD-MONITORAMENTO-02 |
| canal | Canal | select | Não | múltipla | `EMAIL` — E-mail; `SMS` — SMS; `WHATSAPP` — WhatsApp; `ATENDIMENTO` — Atendimento | enum:CanalRegularizacao | — | todos | — | — | RF-MOD-MONITORAMENTO-08 |
| instrumento | Instrumento | select | Não | múltipla | `REGUA_MASSIFICADA` — Régua massificada; `COBRANCA_QUALIFICADA` — Cobrança qualificada | enum:InstrumentoRegularizacao | — | todos | — | — | RF-MOD-MONITORAMENTO-08 |
| tributo | Tributo | select | Não | múltipla | `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST; `IPVA` — IPVA; `ITCD` — ITCD | enum:Tributo | — | todos | — | — | RF-MOD-MONITORAMENTO-08 |
| periodo | Período | daterange | Não | — | — | — | DD/MM/AAAA | ciclo atual | máx. 12 meses | — | RF-MOD-MONITORAMENTO-08 |

**Grid / listagem**

- Colunas exibidas (em ordem): Data, Contribuinte, Tributo, Valor, Origem, Canal, Instrumento, Controle
- Ordenação default: Data, mais recente primeiro
- Paginação: 50 por página
- Ações por linha: Abrir contribuinte
- Mensagem de lista vazia: «Nenhuma regularização para os filtros»

**Comportamento dos filtros**

- Aplica: ao alterar o campo
- Combinação entre filtros: AND
- Limpar todos de uma vez: sim
- Persistência do filtro: filtro salvo da lista
- Dependências entre filtros: Canal só se aplica à origem «Resposta à cobrança»

**Gap associado:** —

---

### PR-MOD-MONITORAMENTO-002 — Painel Institucional de Cobrança

**RF relacionado:** RF-MOD-MONITORAMENTO-07, RF-MOD-MONITORAMENTO-03, RF-MOD-MONITORAMENTO-04, RF-MOD-MONITORAMENTO-05, RF-MOD-MONITORAMENTO-06
**Etapa do fluxo:** ETP-022

**Personas:** Coordenador de Cobrança
**Prioridade:** Must
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O coordenador presta contas e decide a estratégia do próximo ciclo.

**Requisito de experiência:** Mostrar funil, KPIs com variação, tendência cobrada × controle, retorno das réguas e tabela por tributo com meta e alerta.

**Critérios mensuráveis:**
- O efeito incremental aparece em pontos percentuais com o sinal (+/−)
- O alerta de meta lista os tributos abaixo da meta

**Antipadrão (o que evitar):**
- Mostrar taxa de regularização sem comparar com o grupo de controle

**Mapa de estados:**
- Carregando: visualizações com indicador
- Sucesso: indicadores do ciclo
- Erro de validação: —
- Erro de sistema: «Não foi possível carregar o painel. Tente de novo.»
- Vazio: «Sem carteira confirmada no ciclo»
- Offline: aviso da instância

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| ciclo | Ciclo | month | Não | única | *(dinâmica)* | endpoint:ciclos coletados no Platform Analytics | MM/AAAA | ciclo atual | — | — | RF-MOD-MONITORAMENTO-07 |
| tributo | Tributo | select | Não | múltipla | `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST; `IPVA` — IPVA; `ITCD` — ITCD | enum:Tributo | — | todos | — | — | RF-MOD-MONITORAMENTO-07 |
| canal | Canal | select | Não | múltipla | `EMAIL` — E-mail; `SMS` — SMS; `WHATSAPP` — WhatsApp | enum:Canal | — | todos | — | — | RF-MOD-MONITORAMENTO-05 |
| atendente | Atendente | lookup | Não | múltipla | *(dinâmica)* | domainTable:sys_user (papel atendente) | — | todos | — | — | RF-MOD-MONITORAMENTO-07 |

**Grid / listagem**

- Colunas exibidas (em ordem): Tabela por tributo: Tributo, Realizado, Meta, Diferença (p.p.)
- Ordenação default: Tributo
- Paginação: sem paginação
- Ações por linha: nenhuma
- Mensagem de lista vazia: «Sem carteira confirmada no ciclo»

**Comportamento dos filtros**

- Aplica: ao alterar o campo
- Combinação entre filtros: AND
- Limpar todos de uma vez: sim
- Persistência do filtro: sessão
- Dependências entre filtros: —

**Gap associado:** —

---

## Módulo: Governança, Acesso e Auditoria (`MOD-GOVERNANCA`)

### PR-MOD-GOVERNANCA-001 — Parâmetros, faixas de score e metas

**RF relacionado:** RF-MOD-GOVERNANCA-05, RF-MOD-GOVERNANCA-04, RF-MOD-SCORE-02
**Etapa do fluxo:** ETP-024

**Personas:** Administrador da aplicação
**Prioridade:** Should
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O admin ajusta parâmetros, faixas e metas sem desenvolvimento.

**Requisito de experiência:** Manter parâmetros gerais, faixas de score e metas por tributo e ciclo, com histórico das alterações.

**Critérios mensuráveis:**
- Cada alteração mostra, no histórico, valor anterior, valor novo, autor e data
- Valor fora do limite é recusado com mensagem junto ao campo

**Antipadrão (o que evitar):**
- Permitir que o coordenador ou o atendente alterem parâmetros

**Mapa de estados:**
- Carregando: lista com indicador
- Sucesso: «Parâmetro atualizado»
- Erro de validação: percentual fora do limite → «O percentual deve ficar entre 1% e 20%»
- Erro de sistema: «Não foi possível salvar. Tente de novo.»
- Vazio: «Nenhuma meta cadastrada para o ciclo»
- Offline: aviso da instância; nada é salvo

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| chave | Parâmetro | select | Sim | única | `PCT_GRUPO_CONTROLE` — % do grupo de controle; `JANELA_ATRIBUICAO_DIAS` — Janela de atribuição (dias); `LIMITE_REENVIO` — Limite de tentativas de reenvio; `PRAZO_RECEBIMENTO_FONTE` — Horário-limite por fonte | static | — | — | — | — | RF-MOD-GOVERNANCA-05 |
| valor | Valor | text | Sim | — | — | — | conforme o parâmetro | 3% · 30 dias · 3 tentativas | % de controle entre 1% e 20%; janela entre 1 e 90 dias; reenvio entre 0 e 10 | fora do limite → mensagem do parâmetro | RF-MOD-GOVERNANCA-05 |
| faixaNome | Nome da faixa | text | Sim | — | — | — | — | — | até 30 caracteres | — | RF-MOD-SCORE-02 |
| faixaLimites | Limites da faixa | number | Sim | — | — | — | 0,00 a 1,00 | — | inferior < superior | sobreposição → «As faixas não podem se sobrepor» | RF-MOD-SCORE-02 |
| metaTributo | Tributo da meta | select | Sim | única | `ICMS_NORMAL` — ICMS Normal; `ICMS_ST` — ICMS ST; `IPVA` — IPVA; `ITCD` — ITCD | enum:Tributo | — | — | — | — | RF-MOD-GOVERNANCA-05 |
| metaValor | Meta de regularização | percent | Sim | — | — | — | 0,0% | — | 0 a 100% | fora de 0 a 100 → «Informe de 0% a 100%» | RF-MOD-GOVERNANCA-05 |

**Grid / listagem**

- Colunas exibidas (em ordem): Parâmetro, Valor, Vigência, Alterado por, Data
- Ordenação default: Parâmetro
- Paginação: 20 por página
- Ações por linha: Editar; Ver histórico
- Mensagem de lista vazia: «Nenhuma meta cadastrada para o ciclo»

**Comportamento dos filtros**

—

**Gap associado:** —

---

### PR-MOD-GOVERNANCA-002 — Auditoria

**RF relacionado:** RF-MOD-GOVERNANCA-06, RF-MOD-GOVERNANCA-01, RF-MOD-GOVERNANCA-03, RF-MOD-GOVERNANCA-04
**Etapa do fluxo:** ETP-025

**Personas:** Auditor
**Prioridade:** Could
**Origem:** `Discovery` (tela da ETF §6.6 e do protótipo v3 — validar com o cliente)

**Contexto de uso:** O auditor verifica quem fez o quê, inclusive exportações.

**Requisito de experiência:** Listar eventos de auditoria, versões publicadas e exportações registradas, só para leitura.

**Critérios mensuráveis:**
- Nenhuma ação de edição ou exclusão aparece para nenhum papel
- Filtrar por usuário e período devolve a primeira página em até 3 segundos

**Antipadrão (o que evitar):**
- Oferecer exclusão de evento, mesmo para o admin

**Mapa de estados:**
- Carregando: lista com indicador
- Sucesso: eventos com usuário, ação e data
- Erro de validação: —
- Erro de sistema: «Não foi possível carregar a auditoria. Tente de novo.»
- Vazio: «Nenhum evento para os filtros»
- Offline: aviso da instância

**Inventário de campos**

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| usuario | Usuário | lookup | Não | única | *(dinâmica)* | domainTable:sys_user | — | — | — | — | RF-MOD-GOVERNANCA-06 |
| acao | Ação | select | Não | múltipla | `PUBLICACAO` — Publicação; `CONFIRMACAO` — Confirmação; `INTERACAO` — Interação; `ALTERACAO_PARAMETRO` — Alteração de parâmetro; `EXPORTACAO` — Exportação; `OUTRO` — Outro | enum:AcaoAuditoria | — | todas | — | — | RF-MOD-GOVERNANCA-04 |
| periodo | Período | daterange | Não | — | — | — | DD/MM/AAAA | últimos 30 dias | máx. 12 meses | intervalo acima de 12 meses → «Escolha no máximo 12 meses» | RF-MOD-GOVERNANCA-06 |

**Grid / listagem**

- Colunas exibidas (em ordem): Data e hora, Usuário, Ação, Registro afetado
- Ordenação default: Data, mais recente primeiro
- Paginação: 50 por página
- Ações por linha: Abrir evento (leitura)
- Mensagem de lista vazia: «Nenhum evento para os filtros»

**Comportamento dos filtros**

- Aplica: ao acionar o botão «Aplicar»
- Combinação entre filtros: AND
- Limpar todos de uma vez: sim
- Persistência do filtro: nenhuma
- Dependências entre filtros: —

**Gap associado:** —

---

<!-- id: pr-ttfv -->

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

### Jornada: Trabalhar o caso de maior prioridade — persona Atendente de Cobrança

**Espinha padronizada (5 passos):**

| Passo | Descrição | Estado(s) de UI envolvido(s) |
|-------|-----------|------------------------------|
| 1. Entrada | abre «Minha fila» no menu | Carregando, Sucesso |
| 2. Ação principal | abre o caso do topo e lê o dossiê | Sucesso |
| 3. Confirmação | registra a interação e vê «Interação registrada» | Sucesso |
| 4. Erro / recuperação | data de follow-up no passado é recusada junto ao campo | Erro de validação |
| 5. Saída / próximo | volta à fila, já sem o caso se ele foi encerrado | Sucesso, Vazio |

**Checklist das 10 heurísticas de Nielsen (heurística × jornada):**

| # | Heurística | Atende? (✅/⚠️/❌) | Evidência / nota |
|---|-----------|--------------------|------------------|
| 1 | Visibilidade do estado do sistema | ✅ | situação e data da última carga sempre visíveis |
| 2 | Correspondência sistema ↔ mundo real | ✅ | termos do cliente (carteira, régua, caso) |
| 3 | Controle e liberdade do usuário | ✅ | rascunho pode ser descartado; régua pode ser pausada |
| 4 | Consistência e padrões | ✅ | telas nativas do ServiceNow, mesmo padrão em todo o produto |
| 5 | Prevenção de erros | ✅ | botões bloqueados até a condição ser atendida |
| 6 | Reconhecimento em vez de memorização | ✅ | filtros salvos e listas relacionadas |
| 7 | Flexibilidade e eficiência de uso | ✅ | filtros salvos por papel |
| 8 | Estética e design minimalista | ✅ | só as colunas da tarefa do papel |
| 9 | Ajudar a reconhecer, diagnosticar e recuperar de erros | ✅ | mensagens de erro com a ação para corrigir |
| 10 | Ajuda e documentação | ⚠️ | ⚠️ ajuda contextual depende do material de treinamento (operação assistida) |

### Jornada: Formar a carteira do ciclo — persona Coordenador de Cobrança

**Espinha padronizada (5 passos):**

| Passo | Descrição | Estado(s) de UI envolvido(s) |
|-------|-----------|------------------------------|
| 1. Entrada | abre «Critérios de Qualificação» | Carregando, Sucesso |
| 2. Ação principal | ajusta o rascunho e gera a prévia | Carregando, Sucesso |
| 3. Confirmação | publica com fundamentação e confirma a carteira | Sucesso |
| 4. Erro / recuperação | publicar sem prévia vigente é bloqueado com a orientação | Erro de validação |
| 5. Saída / próximo | acompanha a execução das réguas | Sucesso |

**Checklist das 10 heurísticas de Nielsen (heurística × jornada):**

| # | Heurística | Atende? (✅/⚠️/❌) | Evidência / nota |
|---|-----------|--------------------|------------------|
| 1 | Visibilidade do estado do sistema | ✅ | situação e data da última carga sempre visíveis |
| 2 | Correspondência sistema ↔ mundo real | ✅ | termos do cliente (carteira, régua, caso) |
| 3 | Controle e liberdade do usuário | ✅ | rascunho pode ser descartado; régua pode ser pausada |
| 4 | Consistência e padrões | ✅ | telas nativas do ServiceNow, mesmo padrão em todo o produto |
| 5 | Prevenção de erros | ✅ | botões bloqueados até a condição ser atendida |
| 6 | Reconhecimento em vez de memorização | ✅ | filtros salvos e listas relacionadas |
| 7 | Flexibilidade e eficiência de uso | ✅ | filtros salvos por papel |
| 8 | Estética e design minimalista | ✅ | só as colunas da tarefa do papel |
| 9 | Ajudar a reconhecer, diagnosticar e recuperar de erros | ✅ | mensagens de erro com a ação para corrigir |
| 10 | Ajuda e documentação | ⚠️ | ⚠️ ajuda contextual depende do material de treinamento (operação assistida) |

### Jornada: Conferir o ciclo de carga — persona Gestor de Integração

**Espinha padronizada (5 passos):**

| Passo | Descrição | Estado(s) de UI envolvido(s) |
|-------|-----------|------------------------------|
| 1. Entrada | abre «Integrações & Sincronização» | Carregando, Sucesso |
| 2. Ação principal | identifica a fonte em falha no topo | Sucesso |
| 3. Confirmação | reprocessa rejeitados e vê o resultado na linha | Sucesso |
| 4. Erro / recuperação | reprocesso que falha mostra o motivo | Erro de validação, Erro de sistema |
| 5. Saída / próximo | confere o Painel do Score | Sucesso |

**Checklist das 10 heurísticas de Nielsen (heurística × jornada):**

| # | Heurística | Atende? (✅/⚠️/❌) | Evidência / nota |
|---|-----------|--------------------|------------------|
| 1 | Visibilidade do estado do sistema | ✅ | situação e data da última carga sempre visíveis |
| 2 | Correspondência sistema ↔ mundo real | ✅ | termos do cliente (carteira, régua, caso) |
| 3 | Controle e liberdade do usuário | ✅ | rascunho pode ser descartado; régua pode ser pausada |
| 4 | Consistência e padrões | ✅ | telas nativas do ServiceNow, mesmo padrão em todo o produto |
| 5 | Prevenção de erros | ✅ | botões bloqueados até a condição ser atendida |
| 6 | Reconhecimento em vez de memorização | ✅ | filtros salvos e listas relacionadas |
| 7 | Flexibilidade e eficiência de uso | ✅ | filtros salvos por papel |
| 8 | Estética e design minimalista | ✅ | só as colunas da tarefa do papel |
| 9 | Ajudar a reconhecer, diagnosticar e recuperar de erros | ✅ | mensagens de erro com a ação para corrigir |
| 10 | Ajuda e documentação | ⚠️ | ⚠️ ajuda contextual depende do material de treinamento (operação assistida) |
