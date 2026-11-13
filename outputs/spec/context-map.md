# Mapa de contexto — ingestão micro

Status: draft
Última atualização: 2026-11-13
Fontes: outputs/explore/hld-funcional.md, outputs/explore/especificacao-funcional.md, outputs/explore/especificacao-tecnica.md, outputs/explore/modelo-de-dados.md, outputs/explore/gaps.md, inputs/especificacoes/etf-cobranca-inteligente.pdf, inputs/especificacoes/wiki-cobranca-refined/ (15 arquivos), inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx, inputs/prototipo/prototipo-cobranca-v3.html

**Instrução:** não apagar seções; preencher ou declarar *não aplicável* / *ausente na fonte*.

> Kickoff (do `sync-log.md`): sem legado, ramo A (documentação primeiro), ambiente claude. Simulação
> do fluxo do harness até o backlog, sem horas; decisor Pedro. Os fatos vindos de `outputs/explore/`
> usam a âncora `<arquivo> §<seção> <ID>`, com o ID do Explore literal.

<!-- id: context-overview -->

## Resumo executivo *(síntese — não substitui as tabelas abaixo)*

- Projeto / produto (nome provisório): Cobrança Inteligente — produto 2.6 Cobrança da SEFAZ-MT (Profisco II), em ServiceNow
- Objeto do trabalho (uma frase): consolidar os débitos tributários de várias fontes numa visão única por contribuinte, qualificar a carteira, cobrar por réguas automáticas e por atendentes, e medir o efeito da cobrança contra um grupo de controle (F-001 a F-007, F-187)

---

<!-- id: source-files -->

## Inventário de arquivos em `inputs/`

| # | Caminho | Tipo | Tamanho / data | Lido na íntegra? |
|---|---------|------|----------------|------------------|
| 1 | inputs/especificacoes/etf-cobranca-inteligente.pdf | doc (especificação técnica e funcional) | 28 páginas · 1,2 MB · recebido 2026-11-13 | sim |
| 2 | inputs/especificacoes/wiki-cobranca-refined/ (visão, blueprint, 6 requisitos, modelo de dados, transversais, telas, componentes, índice, overview, log) | doc (wiki TO-BE em Markdown) | 15 arquivos · ~115 KB · atualizado 2026-06-22 | sim |
| 3 | inputs/especificacoes/wiki-cobranca-refined-navegador.html | doc (navegador da mesma wiki) | 150 KB | parcial — mesmo conteúdo do item 2, lido pela versão Markdown |
| 4 | inputs/especificacoes/LEIAME.md | doc (índice dos insumos) | 1 KB | sim — só organização, sem fatos de negócio |
| 5 | inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx | doc (apresentação) | 23 slides (7 ocultos) · setembro de 2026 | sim — inclusive os slides ocultos; nomes de pessoas anonimizados |
| 6 | inputs/prototipo/prototipo-cobranca-v3.html | protótipo de validação (HTML único, 13 telas, dados fictícios) | 335 KB | parcial — usado só para intenção de produto (política de protótipo) |
| 7 | inputs/prototipo/LEIAME.md | doc (índice do protótipo) | 1 KB | sim |
| 8 | outputs/explore/ (5 documentos do pré-projeto) | doc (pré-projeto do Explore) | versão 0.1 · 2026-11-13 | sim — fonte principal dos RF e RN |

---

<!-- id: atomic-by-source -->

## Extração atômica **por fonte**

> Os documentos do Explore foram escritos a partir da ETF, da wiki e do plano. Quando o mesmo fato
> está no Explore e numa fonte original, a linha do Explore carrega o ID (para o rastreio do Plan) e a
> fonte original aparece nas tabelas consolidadas. `outputs/explore/modelo-de-dados.md` e
> `outputs/explore/gaps.md` não geram fatos novos: o primeiro resume a ETF §4 (ver F-146 a F-157) e o
> segundo é a lista de questões, refletida em «Questões em aberto».

### Fonte: `outputs/explore/hld-funcional.md`

#### Fatos atômicos

| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |
|----|-----------------------------------------------|---------------------------|-------------------|-------|
| F-001 | O módulo Ingestão e Carteira Consolidada (MOD-INGESTAO) existe para: Receber os débitos das fontes por API e manter a visão única do contribuinte e a posição por tributo. | hld-funcional.md §2 MOD-INGESTAO | Ingestão e Carteira Consolidada | alta |
| F-002 | O módulo Qualificação e Parametrização da Carteira (MOD-QUALIFICACAO) existe para: Definir critérios versionados, simular e confirmar a carteira, separar massificada de qualificada e sortear o grupo de controle. | hld-funcional.md §2 MOD-QUALIFICACAO | Qualificação e Parametrização da Carteira | alta |
| F-003 | O módulo Scoring de Liquidez (MOD-SCORE) existe para: Receber o score da UFMT, classificar em faixas e operar sem score quando ele faltar. | hld-funcional.md §2 MOD-SCORE | Scoring de Liquidez | alta |
| F-004 | O módulo Réguas de Cobrança Massificada (MOD-REGUAS) existe para: Enviar comunicações automáticas e escalonadas por e-mail, SMS e WhatsApp. | hld-funcional.md §2 MOD-REGUAS | Réguas de Cobrança Massificada | alta |
| F-005 | O módulo Cobrança Qualificada (MOD-QUALIFICADA) existe para: Criar, distribuir e priorizar casos para os atendentes, com dossiê e registro de interações. | hld-funcional.md §2 MOD-QUALIFICADA | Cobrança Qualificada | alta |
| F-006 | O módulo Monitoramento e KPIs (MOD-MONITORAMENTO) existe para: Medir funil, regularização, origem da regularização, efeito incremental e metas. | hld-funcional.md §2 MOD-MONITORAMENTO | Monitoramento e KPIs | alta |
| F-007 | O módulo Governança, Acesso e Auditoria (MOD-GOVERNANCA) existe para: Controlar o acesso por papel, mascarar dados pessoais, auditar ações e administrar parâmetros. | hld-funcional.md §2 MOD-GOVERNANCA | Governança, Acesso e Auditoria | alta |
| F-008 | O produto roda como aplicação escopada no ServiceNow (App Engine), com telas nativas de lista e formulário por papel e dois painéis no Platform Analytics; não há tela customizada. | hld-funcional.md §1 | Plataforma | alta |
| F-009 | Fora do escopo: desenvolver o modelo de score (UFMT), inscrição em dívida ativa e execução fiscal, e a integração ponta a ponta com cada sistema parceiro. | hld-funcional.md §1 | Escopo | alta |

#### Inferências *(explicitamente não verbatim)*

| ID | Inferência | Fundamento | Risco |
|----|------------|------------|-------|
| — | nenhuma inferência nesta fonte | — | — |

#### Itens ainda não classificados (NCR)

| ID | Texto / fato | Hipótese |
|----|---------------|----------|
| — | nenhum | — |

---

### Fonte: `outputs/explore/especificacao-funcional.md`

#### Fatos atômicos

| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |
|----|-----------------------------------------------|---------------------------|-------------------|-------|
| F-010 | Persona «Coordenador de Cobrança (CPRF)» (perfil Coordenador): Define e publica critérios, confirma a carteira, gerencia réguas, reatribui casos e acompanha todos os indicadores. | especificacao-funcional.md §1.1 Coordenador de Cobrança (CPRF) | Atores | alta |
| F-011 | Persona «Atendente de Cobrança» (perfil Atendente): Trabalha só os casos atribuídos a ele: consulta o dossiê, registra interações e follow-ups. | especificacao-funcional.md §1.1 Atendente de Cobrança | Atores | alta |
| F-012 | Persona «Gestor de Integração» (perfil Gestor de Integração): Acompanha os lotes recebidos de cada fonte, reprocessa rejeitados e acompanha a ingestão do score. | especificacao-funcional.md §1.1 Gestor de Integração | Atores | alta |
| F-013 | Persona «Auditor» (perfil Auditor): Lê versões de critérios, eventos de auditoria e histórico, sem escrever nada. | especificacao-funcional.md §1.1 Auditor | Atores | alta |
| F-014 | Persona «Administrador da aplicação» (perfil Admin): Administra parâmetros, faixas de score e metas, sem acesso operacional a casos. | especificacao-funcional.md §1.1 Administrador da aplicação | Atores | alta |
| F-015 | Persona «Sistema parceiro (CCF, MPI, Big Data, IPVA, ITCD, SNE/DT-e, UFMT)» (perfil Usuário de integração (um por fonte)): Envia lotes pela própria API e não acessa mais nada. | especificacao-funcional.md §1.1 Sistema parceiro (CCF, MPI, Big Data, IPVA, ITCD, SNE/DT-e, UFMT) | Atores | alta |
| F-016 | Persona «Contribuinte» (perfil — (ator externo)): Recebe as comunicações e regulariza nos canais da SEFAZ; não usa o sistema. | especificacao-funcional.md §1.1 Contribuinte | Atores | alta |
| F-017 | A matriz de acesso define cinco perfis operacionais (Gestor de Integração, Coordenador, Atendente, Auditor, Admin); o atendente só acessa os próprios casos e nenhum perfil humano grava dados de origem. | especificacao-funcional.md §1.2 | Governança, Acesso e Auditoria | alta |
| F-018 | Tela «Integrações & Sincronização» (Módulo nativo · listas de fontes, lotes e rejeitados): Situação de cada fonte, última carga, lotes, registros rejeitados e reprocesso (RF-001 a RF-008, RF-011, RF-015). Visível para: Gestor de Integração. | especificacao-funcional.md §2 RF-001 | Telas | alta |
| F-019 | Tela «Carteira Consolidada» (Módulo nativo · lista de posição por tributo com filtros salvos): Contribuintes × tributo com total em aberto, atraso e situação (RF-014). Visível para: Coordenador, Gestor de Integração. | especificacao-funcional.md §2 RF-014 | Telas | alta |
| F-020 | Tela «Visão Única do Contribuinte» (Formulário nativo do contribuinte com listas relacionadas): Débitos, parcelamentos (com alerta de risco), comunicações e sinalizações do contribuinte (RF-009, RF-010, RF-012, RF-013, RF-052). Visível para: Coordenador; Atendente (só dos próprios casos). | especificacao-funcional.md §2 RF-009 | Telas | alta |
| F-021 | Tela «Critérios de Qualificação» (Módulo nativo · lista e formulário de versões de critérios): Rascunho, prévia, publicação e histórico de versões (RF-016, RF-017). Visível para: Coordenador. | especificacao-funcional.md §2 RF-016 | Telas | alta |
| F-022 | Tela «Prévia da Carteira Segmentada» (Módulo nativo · lista de itens da carteira em simulação): Resultado da simulação: segmento, grupo de controle, confirmação (RF-018 a RF-021, RF-024). Visível para: Coordenador. | especificacao-funcional.md §2 RF-018 | Telas | alta |
| F-023 | Tela «Editor de Régua» (Formulário nativo da régua com lista de etapas): Etapas, prazos, canais e modelos por segmento; pausar e retomar (RF-026, RF-033). Visível para: Coordenador. | especificacao-funcional.md §2 RF-026 | Telas | alta |
| F-024 | Tela «Execução & Status de Disparo» (Módulo nativo · listas de réguas e comunicações): Comunicações por canal, consentimento, situação de entrega e reenvio (RF-027 a RF-032, RF-034). Visível para: Coordenador, Gestor de Integração. | especificacao-funcional.md §2 RF-027 | Telas | alta |
| F-025 | Tela «Minha Fila» (Módulo nativo · lista de casos atribuídos a mim, ordenada por prioridade): Casos do atendente por prioridade (RF-035 a RF-037). Visível para: Atendente. | especificacao-funcional.md §2 RF-035 | Telas | alta |
| F-026 | Tela «Dossiê & Caso» (Formulário nativo do caso com listas relacionadas): Débitos, interações, follow-ups, sinalizações e vínculos; reatribuição pelo coordenador (RF-038 a RF-041). Visível para: Atendente (próprios), Coordenador. | especificacao-funcional.md §2 RF-038 | Telas | alta |
| F-027 | Tela «Regularizações & Origem» (Módulo nativo · lista de regularizações com filtros): Regularizações por origem, canal e instrumento (RF-042, RF-043, RF-049). Visível para: Coordenador. | especificacao-funcional.md §2 RF-042 | Telas | alta |
| F-028 | Tela «Painel Institucional de Cobrança» (Dashboard do Platform Analytics): Funil, KPIs, tendência cobrada × controle, retorno das réguas, realizado × meta e alerta de meta (RF-044 a RF-048). Visível para: Coordenador. | especificacao-funcional.md §2 RF-044 | Telas | alta |
| F-029 | Tela «Painel do Score de Liquidez» (Dashboard do Platform Analytics): Cobertura, score médio, faixas e últimos lotes (RF-022, RF-023, RF-025). Visível para: Gestor de Integração, Coordenador. | especificacao-funcional.md §2 RF-022 | Telas | alta |
| F-030 | Tela «Parâmetros, faixas de score e metas» (Módulo nativo · listas e formulários de parâmetros, faixas e metas): Parâmetros gerais (prazos, janela de atribuição, limite de reenvio), faixas de score e metas por tributo, com histórico de alterações (RF-023, RF-053, RF-054). Visível para: Admin. | especificacao-funcional.md §2 RF-023 | Telas | alta |
| F-031 | Tela «Auditoria» (Módulo nativo · listas de eventos de auditoria e de versões de critérios): Eventos de auditoria, versões publicadas, exportações registradas (RF-050, RF-051, RF-055). Visível para: Auditor, Admin. | especificacao-funcional.md §2 RF-050 | Telas | alta |
| F-032 | Receber débitos por API: Receber os débitos de CCF, MPI, Big Data, IPVA, ITCD e SNE/DT-e por uma API por fonte, com o mesmo padrão de abrir lote, enviar pacotes e fechar lote. | especificacao-funcional.md §3 MOD-INGESTAO RF-001 | Ingestão e Carteira Consolidada | alta |
| F-033 | Validar documento do contribuinte: Conferir o dígito verificador do CPF/CNPJ, guardar só os dígitos e devolver na resposta da API cada registro rejeitado com o motivo. | especificacao-funcional.md §3 MOD-INGESTAO RF-002 | Ingestão e Carteira Consolidada | alta |
| F-034 | Consolidar por contribuinte: Vincular débitos de fontes diferentes ao mesmo contribuinte e manter gravada a posição por tributo. | especificacao-funcional.md §3 MOD-INGESTAO RF-003 | Ingestão e Carteira Consolidada | alta |
| F-035 | Evitar duplicidade no reenvio: Reenviar o mesmo pacote ou registro não duplica débito, parcelamento nem sinalização. | especificacao-funcional.md §3 MOD-INGESTAO RF-004 | Ingestão e Carteira Consolidada | alta |
| F-036 | Fechar o ciclo diário e acompanhar fontes: No prazo de cada fonte, marcar quem não entregou, consolidar o que chegou e mostrar a situação e a última carga de cada fonte. | especificacao-funcional.md §3 MOD-INGESTAO RF-005 | Ingestão e Carteira Consolidada | alta |
| F-037 | Seguir operando com fonte em falha: Falha de uma fonte abre alerta e mantém a última carga válida dela, sem parar as outras. | especificacao-funcional.md §3 MOD-INGESTAO RF-006 | Ingestão e Carteira Consolidada | alta |
| F-038 | Carga inicial e reconciliação: Receber o histórico pelas mesmas APIs e conferir os totais por fonte e por tributo. | especificacao-funcional.md §3 MOD-INGESTAO RF-007 | Ingestão e Carteira Consolidada | alta |
| F-039 | Reprocessar rejeitados: Reaplicar a validação sobre o registro guardado, sem pedir novo envio à fonte. | especificacao-funcional.md §3 MOD-INGESTAO RF-008 | Ingestão e Carteira Consolidada | alta |
| F-040 | Atualizar regularização no ciclo: Atualizar regularização e parcelamento durante o ciclo e encerrar caso e régua de quem regularizou. | especificacao-funcional.md §3 MOD-INGESTAO RF-009 | Ingestão e Carteira Consolidada | alta |
| F-041 | Alertar parcelamento em risco: Marcar como em risco o parcelamento com parcela vencida. | especificacao-funcional.md §3 MOD-INGESTAO RF-010 | Ingestão e Carteira Consolidada | alta |
| F-042 | Transição MPI → Big Data: Receber as duas fontes durante a transição, sem duplicar débito, e registrar o percentual de regras migradas. | especificacao-funcional.md §3 MOD-INGESTAO RF-011 | Ingestão e Carteira Consolidada | alta |
| F-043 | Receber sinalização coercitiva: Receber pela SNE/DT-e as sinalizações de cobrança coercitiva de outras coordenadorias e exibi-las só como informação. | especificacao-funcional.md §3 MOD-INGESTAO RF-012 | Ingestão e Carteira Consolidada | alta |
| F-044 | Visão única do contribuinte: Mostrar num formulário único os débitos, parcelamentos, comunicações e sinalizações do contribuinte. | especificacao-funcional.md §3 MOD-INGESTAO RF-013 | Ingestão e Carteira Consolidada | alta |
| F-045 | Carteira consolidada: Listar a posição contribuinte × tributo com filtros salvos por tributo, atraso, valor e situação. | especificacao-funcional.md §3 MOD-INGESTAO RF-014 | Ingestão e Carteira Consolidada | alta |
| F-046 | Simular cargas das fontes: Gerar lotes simulados por fonte, inclusive inválidos e repetidos, para testar as APIs enquanto os parceiros não estão disponíveis. | especificacao-funcional.md §3 MOD-INGESTAO RF-015 | Ingestão e Carteira Consolidada | alta |
| F-047 | Regra: Débitos de fontes diferentes com o mesmo CPF/CNPJ pertencem a um único contribuinte; a sobreposição entre fontes é resolvida por regra (afeta RF-003, RF-011, RF-013). | especificacao-funcional.md §3 MOD-INGESTAO RN-001 | Ingestão e Carteira Consolidada | alta |
| F-048 | Regra: Ao detectar regularização durante o ciclo, o caso e a régua do contribuinte se encerram e ele não é mais abordado naquele ciclo (afeta RF-009, RF-027, RF-035). | especificacao-funcional.md §3 MOD-INGESTAO RN-002 | Ingestão e Carteira Consolidada | alta |
| F-049 | Regra: A identificação de débitos continua funcionando na transição do MPI para o Big Data, sem ruptura da carteira (afeta RF-011). | especificacao-funcional.md §3 MOD-INGESTAO RN-012 | Ingestão e Carteira Consolidada | alta |
| F-050 | Regra: Registro com CPF/CNPJ inválido é rejeitado e devolvido ao parceiro na resposta da API (afeta RF-002, RF-008). | especificacao-funcional.md §3 MOD-INGESTAO RN-014 | Ingestão e Carteira Consolidada | alta |
| F-051 | Regra: O mesmo lote ou registro enviado de novo não gera duplicidade; o controle é por fonte, lote e sequência do pacote (afeta RF-004). | especificacao-funcional.md §3 MOD-INGESTAO RN-015 | Ingestão e Carteira Consolidada | alta |
| F-052 | Regra: A falha de uma fonte não interrompe as demais; vale a última carga válida da fonte que falhou (afeta RF-005, RF-006). | especificacao-funcional.md §3 MOD-INGESTAO RN-016 | Ingestão e Carteira Consolidada | alta |
| F-053 | Regra: Sinalização de cobrança coercitiva de outra coordenadoria é só informativa; o produto nunca age sobre ela (afeta RF-012, RF-038). | especificacao-funcional.md §3 MOD-INGESTAO RN-017 | Ingestão e Carteira Consolidada | alta |
| F-054 | Regra: Somente as APIs de ingestão gravam dados de contribuinte, débito, parcelamento, posição, vínculo e sinalização; nenhum papel humano escreve nesses dados (afeta RF-001, RF-050). | especificacao-funcional.md §3 MOD-INGESTAO RN-018 | Ingestão e Carteira Consolidada | alta |
| F-055 | Parametrizar critérios: Definir os critérios da carteira: valor, tributo, atraso, instrumento, exclusão de contumazes e limite de score. | especificacao-funcional.md §3 MOD-QUALIFICACAO RF-016 | Qualificação e Parametrização da Carteira | alta |
| F-056 | Versionar critérios: Manter versões numeradas, com um único rascunho aberto; publicar exige fundamentação e prévia vigente. | especificacao-funcional.md §3 MOD-QUALIFICACAO RF-017 | Qualificação e Parametrização da Carteira | alta |
| F-057 | Simular a carteira: Gerar a prévia da carteira a partir do rascunho, sem efeito sobre a operação. | especificacao-funcional.md §3 MOD-QUALIFICACAO RF-018 | Qualificação e Parametrização da Carteira | alta |
| F-058 | Segmentar massificada × qualificada: Classificar cada contribuinte da carteira no segmento definido pela versão. | especificacao-funcional.md §3 MOD-QUALIFICACAO RF-019 | Qualificação e Parametrização da Carteira | alta |
| F-059 | Sortear grupo de controle: Sortear o grupo de controle a cada ciclo, de forma que o sorteio possa ser refeito. | especificacao-funcional.md §3 MOD-QUALIFICACAO RF-020 | Qualificação e Parametrização da Carteira | alta |
| F-060 | Confirmar a carteira: Confirmar a carteira de uma versão publicada, o que libera as réguas e cria os casos. | especificacao-funcional.md §3 MOD-QUALIFICACAO RF-021 | Qualificação e Parametrização da Carteira | alta |
| F-061 | Regra: Os critérios de carteira são configuráveis, versionados e auditáveis; a seleção não depende de conhecimento tácito (afeta RF-016, RF-017). | especificacao-funcional.md §3 MOD-QUALIFICACAO RN-003 | Qualificação e Parametrização da Carteira | alta |
| F-062 | Regra: A carteira se divide entre massificada e qualificada, e o contribuinte segue um único eixo por ciclo (o desempate está no GAP-007) (afeta RF-019, RF-027, RF-035). | especificacao-funcional.md §3 MOD-QUALIFICACAO RN-004 | Qualificação e Parametrização da Carteira | alta |
| F-063 | Regra: Um grupo de controle, por padrão 3% da carteira segmentada, é sorteado a cada ciclo com semente gravada, não é cobrado e serve de base para medir o efeito incremental (afeta RF-020, RF-045). | especificacao-funcional.md §3 MOD-QUALIFICACAO RN-009 | Qualificação e Parametrização da Carteira | alta |
| F-064 | Regra: Os critérios se combinam por E; o limite de score se aplica só a quem tem score (afeta RF-016, RF-018). | especificacao-funcional.md §3 MOD-QUALIFICACAO RN-019 | Qualificação e Parametrização da Carteira | alta |
| F-065 | Regra: Versão publicada e carteira confirmada não podem ser alteradas nem excluídas; mudar critérios cria nova versão, que nasce da última publicada (afeta RF-017, RF-021). | especificacao-funcional.md §3 MOD-QUALIFICACAO RN-020 | Qualificação e Parametrização da Carteira | alta |
| F-066 | Regra: A prévia deixa de valer se os parâmetros mudarem; a confirmação só aceita versão publicada (afeta RF-017, RF-018, RF-021). | especificacao-funcional.md §3 MOD-QUALIFICACAO RN-021 | Qualificação e Parametrização da Carteira | alta |
| F-067 | Receber score da UFMT: Receber o score por lote, vincular ao contribuinte pelo documento e registrar a versão do modelo. | especificacao-funcional.md §3 MOD-SCORE RF-022 | Scoring de Liquidez | alta |
| F-068 | Classificar em faixas: Classificar o score em faixas parametrizáveis. | especificacao-funcional.md §3 MOD-SCORE RF-023 | Scoring de Liquidez | alta |
| F-069 | Operar sem score: Tratar o contribuinte sem score pelos critérios determinísticos, na qualificação e na fila. | especificacao-funcional.md §3 MOD-SCORE RF-024 | Scoring de Liquidez | alta |
| F-070 | Painel do Score: Mostrar cobertura por tributo, score médio, distribuição por faixa e últimos lotes recebidos. | especificacao-funcional.md §3 MOD-SCORE RF-025 | Scoring de Liquidez | alta |
| F-071 | Regra: O score da UFMT é consumido, nunca calculado pelo produto; quando falta ou está indisponível, a qualificação e a priorização usam só os critérios determinísticos (afeta RF-022, RF-024, RF-016, RF-037). | especificacao-funcional.md §3 MOD-SCORE RN-013 | Scoring de Liquidez | alta |
| F-072 | Montar régua: Cadastrar régua por segmento, com etapas ordenadas por prazo, canal e modelo de mensagem com variáveis. | especificacao-funcional.md §3 MOD-REGUAS RF-026 | Réguas de Cobrança Massificada | alta |
| F-073 | Enviar a etapa devida: Calcular diariamente a etapa devida de cada contribuinte e enviar sem confirmação manual. | especificacao-funcional.md §3 MOD-REGUAS RF-027 | Réguas de Cobrança Massificada | alta |
| F-074 | Escalonar e encaminhar: Escalonar quando não há resposta, encerrar quando regulariza e encaminhar à cobrança qualificada quem esgotou a régua. | especificacao-funcional.md §3 MOD-REGUAS RF-028 | Réguas de Cobrança Massificada | alta |
| F-075 | Respeitar consentimento: Conferir opt-in e opt-out do canal no momento do envio. | especificacao-funcional.md §3 MOD-REGUAS RF-029 | Réguas de Cobrança Massificada | alta |
| F-076 | Enviar por canal: Enviar por e-mail, SMS ou WhatsApp pelo provedor contratado, podendo trocar de provedor. | especificacao-funcional.md §3 MOD-REGUAS RF-030 | Réguas de Cobrança Massificada | alta |
| F-077 | Receber status de entrega: Receber do provedor o status de cada comunicação e atualizá-lo sem duplicar. | especificacao-funcional.md §3 MOD-REGUAS RF-031 | Réguas de Cobrança Massificada | alta |
| F-078 | Reenviar falhas: Reenviar a comunicação que falhou até o limite de tentativas. | especificacao-funcional.md §3 MOD-REGUAS RF-032 | Réguas de Cobrança Massificada | alta |
| F-079 | Pausar e retomar régua: Interromper a criação de novas comunicações sem cancelar as já enviadas. | especificacao-funcional.md §3 MOD-REGUAS RF-033 | Réguas de Cobrança Massificada | alta |
| F-080 | Acompanhar execução: Listar comunicações por régua, canal e situação. | especificacao-funcional.md §3 MOD-REGUAS RF-034 | Réguas de Cobrança Massificada | alta |
| F-081 | Regra: A régua escalona conforme o comportamento: sem resposta, renotifica e intensifica; com regularização, encerra (afeta RF-027, RF-028). | especificacao-funcional.md §3 MOD-REGUAS RN-005 | Réguas de Cobrança Massificada | alta |
| F-082 | Regra: Só recebe mensagem no canal quem tem opt-in vigente; o opt-out vale imediatamente e fica registrado (afeta RF-029, RF-030). | especificacao-funcional.md §3 MOD-REGUAS RN-006 | Réguas de Cobrança Massificada | alta |
| F-083 | Regra: Cada segmento tem uma única régua ativa; etapas não se repetem e o modelo só usa variáveis existentes (afeta RF-026). | especificacao-funcional.md §3 MOD-REGUAS RN-022 | Réguas de Cobrança Massificada | alta |
| F-084 | Regra: Comunicação em falha é reenviada até o limite de tentativas definido em parâmetro (afeta RF-032). | especificacao-funcional.md §3 MOD-REGUAS RN-023 | Réguas de Cobrança Massificada | alta |
| F-085 | Regra: Pausar a régua não cancela as comunicações já enviadas (afeta RF-033). | especificacao-funcional.md §3 MOD-REGUAS RN-024 | Réguas de Cobrança Massificada | alta |
| F-086 | Criar casos: Criar o caso (numeração CQ-ano-sequencial) a partir da carteira confirmada ou do esgotamento da régua. | especificacao-funcional.md §3 MOD-QUALIFICADA RF-035 | Cobrança Qualificada | alta |
| F-087 | Distribuir casos: Atribuir os casos aos atendentes por carga de trabalho ou por grupo. | especificacao-funcional.md §3 MOD-QUALIFICADA RF-036 | Cobrança Qualificada | alta |
| F-088 | Fila priorizada: Mostrar ao atendente os próprios casos ordenados por prioridade (score, valor e atraso). | especificacao-funcional.md §3 MOD-QUALIFICADA RF-037 | Cobrança Qualificada | alta |
| F-089 | Dossiê do caso: Reunir no formulário do caso débitos, parcelamentos, interações, follow-ups, sinalizações e vínculos econômicos. | especificacao-funcional.md §3 MOD-QUALIFICADA RF-038 | Cobrança Qualificada | alta |
| F-090 | Registrar interação: Registrar cada contato com o contribuinte, sem possibilidade de alterar ou excluir depois. | especificacao-funcional.md §3 MOD-QUALIFICADA RF-039 | Cobrança Qualificada | alta |
| F-091 | Follow-up com lembrete: Agendar follow-up com data e notificar o atendente no dia. | especificacao-funcional.md §3 MOD-QUALIFICADA RF-040 | Cobrança Qualificada | alta |
| F-092 | Reatribuir casos: Permitir ao coordenador reatribuir casos entre atendentes. | especificacao-funcional.md §3 MOD-QUALIFICADA RF-041 | Cobrança Qualificada | alta |
| F-093 | Regra: Os casos são distribuídos automaticamente por regra (carga, grupo, prioridade), sem planilha (afeta RF-036, RF-041). | especificacao-funcional.md §3 MOD-QUALIFICADA RN-007 | Cobrança Qualificada | alta |
| F-094 | Regra: Toda ação relevante (disparo, distribuição, alteração de regra ou régua, encerramento de caso, interação) fica registrada com autor e data, e não pode ser alterada (afeta RF-039, RF-053). | especificacao-funcional.md §3 MOD-QUALIFICADA RN-010 | Cobrança Qualificada | alta |
| F-095 | Regra: A prioridade da fila usa score, valor e atraso; sem score, usa só valor e atraso (afeta RF-037). | especificacao-funcional.md §3 MOD-QUALIFICADA RN-025 | Cobrança Qualificada | alta |
| F-096 | Marcar notificado e regularizado: Marcar o item da carteira como notificado ao enviar comunicação ou registrar interação, e como regularizado ao registrar a regularização. | especificacao-funcional.md §3 MOD-MONITORAMENTO RF-042 | Monitoramento e KPIs | alta |
| F-097 | Atribuir origem da regularização: Classificar cada regularização como espontânea ou resposta à cobrança, por canal e instrumento. | especificacao-funcional.md §3 MOD-MONITORAMENTO RF-043 | Monitoramento e KPIs | alta |
| F-098 | Indicadores de funil: Contar identificados, notificados e regularizados, e somar o crédito recuperado. | especificacao-funcional.md §3 MOD-MONITORAMENTO RF-044 | Monitoramento e KPIs | alta |
| F-099 | Efeito incremental: Calcular a taxa de regularização da carteira cobrada, a do grupo de controle e a diferença em pontos percentuais. | especificacao-funcional.md §3 MOD-MONITORAMENTO RF-045 | Monitoramento e KPIs | alta |
| F-100 | Retorno das réguas: Calcular a parcela das comunicações pagas em até 30 dias. | especificacao-funcional.md §3 MOD-MONITORAMENTO RF-046 | Monitoramento e KPIs | alta |
| F-101 | Realizado × meta: Comparar a taxa realizada com a meta por tributo e alertar meta não atingida. | especificacao-funcional.md §3 MOD-MONITORAMENTO RF-047 | Monitoramento e KPIs | alta |
| F-102 | Painel Institucional: Mostrar funil, KPIs com variação, tendência cobrada × controle e tabela por tributo com meta. | especificacao-funcional.md §3 MOD-MONITORAMENTO RF-048 | Monitoramento e KPIs | alta |
| F-103 | Regularizações por origem: Listar as regularizações com filtros por origem, canal e instrumento. | especificacao-funcional.md §3 MOD-MONITORAMENTO RF-049 | Monitoramento e KPIs | alta |
| F-104 | Regra: Toda regularização é marcada quanto à origem: espontânea ou resposta à cobrança (afeta RF-043, RF-049). | especificacao-funcional.md §3 MOD-MONITORAMENTO RN-008 | Monitoramento e KPIs | alta |
| F-105 | Regra: O coordenador vê toda a carteira e os comparativos; o atendente vê só os próprios casos, sem comparativo e sem dashboards (afeta RF-048, RF-037, RF-051). | especificacao-funcional.md §3 MOD-MONITORAMENTO RN-011 | Monitoramento e KPIs | alta |
| F-106 | Regra: A regularização conta como resposta à cobrança quando há contato de cobrança na janela parametrizável (padrão de 30 dias); no grupo de controle ela é sempre espontânea (afeta RF-043, RF-045). | especificacao-funcional.md §3 MOD-MONITORAMENTO RN-026 | Monitoramento e KPIs | alta |
| F-107 | Regra: Os indicadores são calculados direto das tabelas da aplicação, sem tabela de fotografia; a coleta diária forma o histórico (afeta RF-044 a RF-048). | especificacao-funcional.md §3 MOD-MONITORAMENTO RN-027 | Monitoramento e KPIs | alta |
| F-108 | Controlar acesso por papel: Aplicar a matriz de acesso dos cinco papéis na camada de dados, a cada consulta. | especificacao-funcional.md §3 MOD-GOVERNANCA RF-050 | Governança, Acesso e Auditoria | alta |
| F-109 | Isolar a visão do atendente: Garantir que o atendente leia só os próprios casos e os dados do contribuinte desses casos. | especificacao-funcional.md §3 MOD-GOVERNANCA RF-051 | Governança, Acesso e Auditoria | alta |
| F-110 | Mascarar CPF e restringir exportação: Mascarar o CPF de pessoa física por padrão e permitir exportação só a papéis autorizados, registrando cada uma. | especificacao-funcional.md §3 MOD-GOVERNANCA RF-052 | Governança, Acesso e Auditoria | alta |
| F-111 | Auditar ações e parâmetros: Registrar eventos de auditoria e as alterações de parâmetros, metas e faixas de score com valor anterior, valor novo, autor e vigência. | especificacao-funcional.md §3 MOD-GOVERNANCA RF-053 | Governança, Acesso e Auditoria | alta |
| F-112 | Administrar parâmetros: Manter parâmetros gerais, faixas de score e metas por tributo e ciclo. | especificacao-funcional.md §3 MOD-GOVERNANCA RF-054 | Governança, Acesso e Auditoria | alta |
| F-113 | Consultar auditoria: Permitir ao auditor ler versões, eventos de auditoria e histórico, sem escrita. | especificacao-funcional.md §3 MOD-GOVERNANCA RF-055 | Governança, Acesso e Auditoria | alta |
| F-114 | Regra: O controle de acesso vale na camada de dados; esconder menu ou módulo não basta (afeta RF-050, RF-051). | especificacao-funcional.md §3 MOD-GOVERNANCA RN-028 | Governança, Acesso e Auditoria | alta |
| F-115 | Regra: O CPF de pessoa física aparece mascarado por padrão, e toda exportação fica registrada (afeta RF-052). | especificacao-funcional.md §3 MOD-GOVERNANCA RN-029 | Governança, Acesso e Auditoria | alta |
| F-116 | Regra: Evento de auditoria não pode ser alterado nem excluído por nenhum papel (afeta RF-053, RF-055). | especificacao-funcional.md §3 MOD-GOVERNANCA RN-030 | Governança, Acesso e Auditoria | alta |

#### Inferências *(explicitamente não verbatim)*

| ID | Inferência | Fundamento | Risco |
|----|------------|------------|-------|
| — | nenhuma inferência nesta fonte | — | — |

#### Itens ainda não classificados (NCR)

| ID | Texto / fato | Hipótese |
|----|---------------|----------|
| — | nenhum | — |

---

### Fonte: `outputs/explore/especificacao-tecnica.md`

#### Fatos atômicos

| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |
|----|-----------------------------------------------|---------------------------|-------------------|-------|
| F-117 | Integração com Conta Corrente Fiscal (CCF) (entrada): Débitos de ICMS, parcelamentos e contumazes; carga incremental por data de alteração. Observação: Lote por fonte com lidos, aceitos, rejeitados e situação; alerta de falha. | especificacao-tecnica.md §3 Conta Corrente Fiscal (CCF) | Integrações | alta |
| F-118 | Integração com MPI (em descontinuação) (entrada): Elegíveis de ICMS; percentual de regras migradas. Observação: Idem, mais o percentual de migração. | especificacao-tecnica.md §3 MPI (em descontinuação) | Integrações | alta |
| F-119 | Integração com Big Data (P2.2) (entrada): Elegíveis à cobrança, sem duplicar o que veio do MPI. Observação: Idem. | especificacao-tecnica.md §3 Big Data (P2.2) | Integrações | alta |
| F-120 | Integração com Sistema IPVA (entrada): Débitos de IPVA, maioria de pessoa física; opt-in do contribuinte. Observação: Idem. | especificacao-tecnica.md §3 Sistema IPVA | Integrações | alta |
| F-121 | Integração com GIA-ITCD (entrada): Débitos e declarações de ITCD. Observação: Idem. | especificacao-tecnica.md §3 GIA-ITCD | Integrações | alta |
| F-122 | Integração com SNE / DT-e (entrada): Débitos e sinalizações de cobrança coercitiva. Observação: Idem. | especificacao-tecnica.md §3 SNE / DT-e | Integrações | alta |
| F-123 | Integração com UFMT (modelo de score) (entrada): Score de liquidez por contribuinte, com versão do modelo. Observação: Lote com versão do modelo e cobertura no Painel do Score. | especificacao-tecnica.md §3 UFMT (modelo de score) | Integrações | alta |
| F-124 | Integração com Provedor de e-mail, SMS e WhatsApp (saída): Comunicações das réguas. Observação: Situação de cada comunicação e reenvio de falhas. | especificacao-tecnica.md §3 Provedor de e-mail, SMS e WhatsApp | Integrações | alta |
| F-125 | Integração com Provedor de e-mail, SMS e WhatsApp (entrada (callback)): Status de entrega e respostas. Observação: Atualização da comunicação sem duplicar. | especificacao-tecnica.md §3 Provedor de e-mail, SMS e WhatsApp | Integrações | alta |
| F-126 | Integração com B-Cadastro e Cadastro de Contadores (entrada (consulta)): Dados cadastrais e vínculo contador–contribuinte. Observação: A definir (ver GAP-012). | especificacao-tecnica.md §3 B-Cadastro e Cadastro de Contadores | Integrações | alta |
| F-127 | Premissa técnica «Plataforma ServiceNow»: A aplicação é escopada no App Engine; o ServiceNow está confirmado como plataforma de desenvolvimento. | especificacao-tecnica.md §4 Plataforma ServiceNow | Plataforma | média |
| F-128 | Premissa técnica «Sem interface customizada»: A visão de cada papel é a interface nativa (listas e formulários); só os dois painéis são dashboards. | especificacao-tecnica.md §4 Sem interface customizada | Plataforma | média |
| F-129 | Premissa técnica «Fontes empurram os dados»: Cada sistema parceiro chama a API da aplicação; o produto não consulta os parceiros. | especificacao-tecnica.md §4 Fontes empurram os dados | Plataforma | média |
| F-130 | Premissa técnica «Testes com lotes simulados»: Os parceiros ainda não podem ser consumidos; a integração ponta a ponta não está no escopo. | especificacao-tecnica.md §4 Testes com lotes simulados | Plataforma | média |
| F-131 | Premissa técnica «Platform Analytics licenciado»: Os indicadores e os dois painéis dependem da licença. | especificacao-tecnica.md §4 Platform Analytics licenciado | Plataforma | média |
| F-132 | Premissa técnica «Volume»: Cerca de 1,8 milhão de contribuintes na base e cerca de 22 mil comunicações por dia; o score chega em lotes de cerca de 1,4 milhão de linhas. | especificacao-tecnica.md §4 Volume | Plataforma | média |
| F-133 | Premissa técnica «Ciclo diário»: Consolidação e atualização de regularização uma vez por dia. | especificacao-tecnica.md §4 Ciclo diário | Plataforma | média |
| F-134 | Premissa técnica «Indicadores sem tabela de fotografia»: A tendência por ciclo vem da coleta agendada do Platform Analytics. | especificacao-tecnica.md §4 Indicadores sem tabela de fotografia | Plataforma | média |

#### Inferências *(explicitamente não verbatim)*

| ID | Inferência | Fundamento | Risco |
|----|------------|------------|-------|
| — | nenhuma inferência nesta fonte | — | — |

#### Itens ainda não classificados (NCR)

| ID | Texto / fato | Hipótese |
|----|---------------|----------|
| — | nenhum | — |

---

### Fonte: `inputs/especificacoes/etf-cobranca-inteligente.pdf`

#### Fatos atômicos

| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |
|----|-----------------------------------------------|---------------------------|-------------------|-------|
| F-135 | A aplicação é escopada no App Engine, com escopo x_cbi_ ainda a confirmar. | ETF §1.1 | Plataforma | alta |
| F-136 | Nenhum widget, página de UI Builder, workspace ou portal é construído ou estimado. | ETF §1.1 | Plataforma | alta |
| F-137 | Das 12 telas do protótipo, só o Painel Institucional e o Painel do Score viram dashboards; as outras dez viram listas e formulários nativos. | ETF §1.1 e §6.6 | Telas | alta |
| F-138 | O Platform Analytics é usado só nos dois painéis, e o licenciamento dele está por confirmar. | ETF §1.1 | Monitoramento e KPIs | alta |
| F-139 | Cada fonte é uma Scripted REST API criada na aplicação, que o sistema parceiro chama para enviar os dados; são sete APIs (CCF, MPI, Big Data, IPVA, ITCD, SNE/DT-e e Score UFMT). | ETF §1.1 | Ingestão e Carteira Consolidada | alta |
| F-140 | Os sistemas parceiros ainda não podem ser consumidos; as APIs são testadas com lotes simulados e testes de contrato, e a integração ponta a ponta não está estimada. | ETF §1.1 | Integrações | alta |
| F-141 | A integração de saída com o provedor de e-mail, SMS e WhatsApp está no escopo, mas o contrato técnico do provedor não é aprofundado. | ETF §1.1 | Réguas de Cobrança Massificada | alta |
| F-142 | Autenticação e login ficam com a instância ServiceNow (login nativo ou SSO corporativo); o escopo cobre a autorização por papel e a autenticação das APIs de ingestão. | ETF §1.1 | Governança, Acesso e Auditoria | alta |
| F-143 | A estimativa considera um desenvolvedor único, sênior, com 6,5 horas por dia. | ETF §1.1 | Projeto | alta |
| F-144 | A estimativa total é de 408 horas, cerca de 12,55 semanas de desenvolvimento solo. | ETF §2 | Projeto | alta |
| F-145 | O cronograma sugerido tem 13 semanas, da modelagem de dados à contingência. | ETF §3 | Projeto | alta |
| F-146 | O modelo tem 26 tabelas customizadas no escopo x_cbi_, reutiliza sys_user e estende a tabela nativa task para caso e follow-up. | ETF §4 | Dados | alta |
| F-147 | Não há tabela própria de ciclo do crédito, de funil nem de fotografia; os indicadores são calculados direto das tabelas. | ETF §4 e §2.2 | Monitoramento e KPIs | alta |
| F-148 | Cada envio de uma fonte é um lote composto por pacotes, com identificador do lote como chave de idempotência. | ETF §4.2 x_cbi_sync_execucao | Ingestão e Carteira Consolidada | alta |
| F-149 | O lote de score tem cerca de 1,4 milhão de linhas no exemplo. | ETF §2.1 API Score UFMT | Scoring de Liquidez | alta |
| F-150 | A camada de envio deve suportar a ordem de 22 mil comunicações por dia. | ETF §2.1 Camada de envio | Réguas de Cobrança Massificada | alta |
| F-151 | O grupo de controle tem percentual padrão de 3% da carteira segmentada, com semente gravada na carteira. | ETF §2.1 Sorteio do grupo de controle | Qualificação e Parametrização da Carteira | alta |
| F-152 | A janela de atribuição da regularização é parametrizável, com padrão de 30 dias; o grupo de controle é sempre espontâneo. | ETF §2.1 Atribuição de origem | Monitoramento e KPIs | alta |
| F-153 | O caso recebe numeração CQ-AAAA-NNNN; o parcelamento usa o formato PAR-AAAA-NNNNN. | ETF §2.1 e §4.2 | Cobrança Qualificada | alta |
| F-154 | O motivo de rejeição de registro é uma lista fechada: CPF/CNPJ inválido, campo obrigatório ausente, contribuinte não encontrado, formato inválido, outro. | ETF §4.2 x_cbi_registro_rejeitado | Ingestão e Carteira Consolidada | alta |
| F-155 | Os tributos tratados são ICMS Normal, ICMS ST, IPVA e ITCD. | ETF §4.2 x_cbi_debito | Ingestão e Carteira Consolidada | alta |
| F-156 | O contribuinte tem situação de cobrança: sem ação, notificado, em cobrança, regularizado. | ETF §4.2 x_cbi_contribuinte | Ingestão e Carteira Consolidada | alta |
| F-157 | A sinalização coercitiva tem tipos protesto (PGE), notificação coercitiva e outro, e é só informativa. | ETF §4.2 x_cbi_sinalizacao | Ingestão e Carteira Consolidada | alta |
| F-158 | A matriz de acesso por papel é proposta e está marcada [A VALIDAR]. | ETF §6.4 | Governança, Acesso e Auditoria | alta |
| F-159 | O Painel Institucional é visível só ao Coordenador; o Painel do Score, ao Gestor de Integração e ao Coordenador; o atendente não acessa dashboards e usa a lista Minha fila. | ETF §6.5 | Monitoramento e KPIs | alta |
| F-160 | O compartilhamento de dashboards segue os papéis da aplicação mapeados aos papéis nativos do Platform Analytics, ainda [A VALIDAR]. | ETF §6.5 | Monitoramento e KPIs | alta |
| F-161 | O MPI está em descontinuação e convive com o Big Data, registrando o percentual de regras migradas. | ETF §2.1 API MPI | Ingestão e Carteira Consolidada | alta |
| F-162 | A fonte IPVA tem volume alto e maioria de pessoa física, o que exige tratamento e mascaramento de CPF. | ETF §2.1 API IPVA | Ingestão e Carteira Consolidada | alta |

#### Inferências *(explicitamente não verbatim)*

| ID | Inferência | Fundamento | Risco |
|----|------------|------------|-------|
| — | nenhuma inferência nesta fonte | — | — |

#### Itens ainda não classificados (NCR)

| ID | Texto / fato | Hipótese |
|----|---------------|----------|
| — | nenhum | — |

---

### Fonte: `inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx`

#### Fatos atômicos

| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |
|----|-----------------------------------------------|---------------------------|-------------------|-------|
| F-163 | O plano de implementação 2.6 Cobrança é de setembro de 2026. | plano slide 1 | Projeto | alta |
| F-164 | O diagnóstico e o redesenho dos 7 produtos levaram 11 meses; a Etapa 4, implementação e capacitação, dura 7 meses e começa agora. | plano slide 4 | Projeto | alta |
| F-165 | O ServiceNow está confirmado como plataforma de desenvolvimento. | plano slide 4 | Plataforma | alta |
| F-166 | A responsabilidade pelas integrações com os sistemas da SEFAZ-MT passou para a TI, que analisa as necessidades levantadas. | plano slide 4 | Integrações | alta |
| F-167 | A v1 cobre consolidação, qualificação, réguas multicanal, atendimento qualificado e indicadores; réguas e cobrança qualificada estão marcadas como parcialmente atendidas. | plano slide 7 | Escopo | alta |
| F-168 | As réguas priorizadas cobrem parcelamentos, IPVA, ITCD, ICMS Normal e ICMS ST. | plano slide 7 | Réguas de Cobrança Massificada | alta |
| F-169 | O escopo se organiza em 5 épicos e 6 funcionalidades (F1 a F6), mais transversais de papéis, mascaramento, auditoria e interface nativa. | plano slide 9 | Escopo | alta |
| F-170 | O cronograma vai do plano de implementação em dezembro de 2026 ao treinamento e operação assistida em abril de 2027, com construção por squad. | plano slide 11 | Projeto | alta |
| F-171 | A homologação tem cinco etapas: preparação, testes integrados, homologação, correção e reteste, aceite e go-live. | plano slide 13 | Projeto | alta |
| F-172 | A Coordenação de Cobrança (CPRF) é dona do produto: aprova o roteiro e os critérios de aceite, decide o go/no-go e assina o aceite. | plano slide 13 | Atores | alta |
| F-173 | Os atendentes de cobrança são usuários-chave e executam o roteiro de homologação. | plano slide 13 | Atores | alta |
| F-174 | A EloGroup monta o roteiro, conduz a homologação e consolida as evidências; o SQUAD Cobrança mantém o ambiente e corrige defeitos. | plano slide 13 | Atores | alta |
| F-175 | A TI SEFAZ-MT disponibiliza acessos, credenciais e ambientes dos sistemas integrados. | plano slide 13 | Atores | alta |
| F-176 | O 2.6 Cobrança depende de 19 APIs: 5 prontas, 2 parciais, 9 a desenvolver e 3 sem resposta (base 30/09). | plano slides 22-23 | Integrações | alta |
| F-177 | As APIs do MPI, do Big Data e do Score UFMT estão sem resposta da TI. | plano slide 23 | Integrações | alta |
| F-178 | O controle de contribuintes contumazes é feito pelo sistema Credep, segundo a TI. | plano slide 22 | Qualificação e Parametrização da Carteira | alta |
| F-179 | A contratação do WhatsApp precisa ser verificada, e a volumetria do serviço de e-mail institucional precisa ser checada. | plano slide 22 | Réguas de Cobrança Massificada | alta |
| F-180 | Há APIs prontas para dados cadastrais (B-Cadastro), vínculo contador–contribuinte, SSO e débitos e parcelamentos da CCF; a de parcelamentos ainda não consulta parcelas em atraso. | plano slide 23 | Integrações | alta |
| F-181 | As premissas acordadas com a gestão do contrato (banco de horas, ritos, ambientes, dados, homologação, treinamento, mudança de escopo) estão todas a preencher. | plano slide 3 | Projeto | alta |
| F-182 | Riscos declarados: contrato definitivo de cada fonte com o parceiro, contrato do score com a UFMT, licença do Platform Analytics, contrato do provedor de comunicação e matriz de acesso a validar. | plano slides 14-19 | Projeto | alta |

#### Inferências *(explicitamente não verbatim)*

| ID | Inferência | Fundamento | Risco |
|----|------------|------------|-------|
| — | nenhuma inferência nesta fonte | — | — |

#### Itens ainda não classificados (NCR)

| ID | Texto / fato | Hipótese |
|----|---------------|----------|
| — | nenhum | — |

---

### Fonte: `inputs/especificacoes/wiki-cobranca-refined/`

#### Fatos atômicos

| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |
|----|-----------------------------------------------|---------------------------|-------------------|-------|
| F-183 | A base consolidada tem cerca de 1,8 milhão de contribuintes. | wiki log.md 2026-06-15 | Ingestão e Carteira Consolidada | alta |
| F-184 | Histórico de quitação: cerca de 30,9% no ICMS Normal e 22,5% no ICMS ST. | wiki visao.md §3 Métricas de sucesso | Monitoramento e KPIs | alta |
| F-185 | A taxa de retorno de réguas de referência é cerca de 5,15% (valor pago em até 30 dias). | wiki visao.md §3 Métricas de sucesso | Monitoramento e KPIs | alta |
| F-186 | O exemplo do glossário fala em cerca de 500 elegíveis no grupo de controle por ciclo. | wiki visao.md §2 Grupo de Controle | Qualificação e Parametrização da Carteira | alta |
| F-187 | A métrica principal é o crédito tributário recuperado atribuível à cobrança, descontado o efeito do grupo de controle. | wiki visao.md §3 Métricas de sucesso | Monitoramento e KPIs | alta |
| F-188 | Duas métricas de proteção: taxa de regularização espontânea do grupo de controle e reclamações ou opt-out por canal. | wiki visao.md §3 Guard-rails | Monitoramento e KPIs | alta |
| F-189 | Dor do coordenador: a seleção da carteira qualificada é empírica, não auditável nem replicável. | wiki visao.md §1 Persona Coordenador | Qualificação e Parametrização da Carteira | alta |
| F-190 | Dor do coordenador: a distribuição da carteira é manual, por planilhas e Google Drive. | wiki visao.md §1 Persona Coordenador | Cobrança Qualificada | alta |
| F-191 | Dor do coordenador: não há visão gerencial em tempo real; os indicadores dependem de extração e cruzamento manual. | wiki visao.md §1 Persona Coordenador | Monitoramento e KPIs | alta |
| F-192 | Dor do coordenador: o disparo de cobrança exige confirmações manuais em lote, sem régua estruturada. | wiki visao.md §1 Persona Coordenador | Réguas de Cobrança Massificada | alta |
| F-193 | Dor do coordenador: o grupo de controle é montado por sorteio manual, sem cálculo sistemático do efeito incremental. | wiki visao.md §1 Persona Coordenador | Qualificação e Parametrização da Carteira | alta |
| F-194 | Dor do atendente: precisa consultar vários sistemas (CCF, SNE, SUCOM) para montar o histórico antes do contato. | wiki visao.md §1 Persona Atendente | Cobrança Qualificada | alta |
| F-195 | Dor do atendente: risco de abordar contribuinte que já regularizou, porque o status só é atualizado numa foto mensal. | wiki visao.md §1 Persona Atendente | Ingestão e Carteira Consolidada | alta |
| F-196 | Dor do atendente: o histórico de interações é disperso, sem registro estruturado por caso. | wiki visao.md §1 Persona Atendente | Cobrança Qualificada | alta |
| F-197 | O score da UFMT é horizonte H2 na wiki: depende da entrega do modelo, e os dados de cobrança alimentam o modelo a partir de maio de 2026. | wiki Requisitos/scoring-liquidez.md §2.2 | Scoring de Liquidez | alta |
| F-198 | A wiki prevê distribuição de casos por vínculo contador ↔ atendente, balanceamento de carga e prioridade. | wiki visao.md §3 regra 7 | Cobrança Qualificada | alta |
| F-199 | A wiki prevê disparo em lote de centenas de milhares de comunicações por ciclo sem degradar as telas. | wiki Requisitos/reguas-cobranca.md §2.3 | Réguas de Cobrança Massificada | alta |
| F-200 | Não-objetivos: desenvolver o modelo de score e tratar inscrição em dívida ativa ou execução fiscal (PGE e produto 2.4 Contencioso). | wiki visao.md §1 Não-objetivos | Escopo | alta |

#### Inferências *(explicitamente não verbatim)*

| ID | Inferência | Fundamento | Risco |
|----|------------|------------|-------|
| — | nenhuma inferência nesta fonte | — | — |

#### Itens ainda não classificados (NCR)

| ID | Texto / fato | Hipótese |
|----|---------------|----------|
| — | nenhum | — |

---

### Fonte: `inputs/prototipo/prototipo-cobranca-v3.html` *(protótipo de validação — só intenção, nunca AS-IS)*

#### Fatos atômicos

| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |
|----|-----------------------------------------------|---------------------------|-------------------|-------|
| — | nenhum fato: o protótipo é referência visual; o que ele sugere entra como inferência | — | — | — |

#### Inferências *(explicitamente não verbatim)*

| ID | Inferência | Fundamento | Risco |
|----|------------|------------|-------|
| INF-001 | O protótipo v3 propõe uma «Cobrança Ativa» massificada por telefone (lista de ligações distribuída entre atendentes), separada da cobrança qualificada. | protótipo v3 (tela-fila); wiki log.md 2026-06-22 | Funcionalidade fora da ETF entra ou sai do escopo sem decisão registrada |
| INF-002 | O protótipo v3 propõe a cobrança qualificada como esteira em cinco estágios (em seleção, caso selecionado, dossiê gerado, condução, desfecho), para poucos casos de grandes devedores. | protótipo v3 (tela-dossie); wiki log.md 2026-06-22 | O campo de estágio do caso pode não refletir o processo validado |
| INF-003 | O protótipo v3 tira o score do cabeçalho do dossiê e o trata como horizonte H2, o que sugere que o cliente não conta com o score na entrada em produção. | wiki log.md 2026-06-22 (proto-v2); protótipo v3 (tela-score) | Planejar F3 na v1 sem o modelo pronto |
| INF-004 | O contato-chave do contribuinte (nome, cargo, telefone, e-mail) é editável no protótipo, o que exige campo e tratamento de dado pessoal que a ETF não modela. | protótipo v3 (tela-dossie) | Dado pessoal sem base legal nem modelo definido |

#### Itens ainda não classificados (NCR)

| ID | Texto / fato | Hipótese |
|----|---------------|----------|
| — | nenhum | — |

<!-- id: numbers-dates -->

## Números, datas, volumes, SLAs citados *(não perder)*

| Valor | Contexto | Fonte (ID F-xxx ou arquivo) |
|-------|----------|------------------------------|
| ~1,8 milhão | contribuintes na base consolidada | F-183, F-132 |
| ~1,4 milhão de linhas | tamanho do lote de score no exemplo | F-149 |
| ~22 mil por dia | comunicações que a camada de envio precisa suportar | F-150 |
| centenas de milhares por ciclo | disparo em lote previsto pela wiki | F-199 |
| 3% | percentual padrão do grupo de controle sobre a carteira segmentada | F-151 |
| ~500 por ciclo | exemplo de tamanho do grupo de controle na wiki | F-186 |
| 30 dias | janela padrão de atribuição da regularização e de «paga em até 30 dias» | F-152, F-185 |
| 30,9% e 22,5% | histórico de quitação do ICMS Normal e do ICMS ST | F-184 |
| 5,15% | taxa de retorno de réguas de referência | F-185 |
| 26 | tabelas customizadas no escopo x_cbi_ | F-146 |
| 7 | APIs de ingestão (6 fontes de débito + score) | F-139 |
| 19 (5 prontas, 2 parciais, 9 a desenvolver, 3 sem resposta) | APIs de que o produto depende, base 30/09 | F-176 |
| 5 | papéis de acesso | F-017, F-158 |
| 12 → 2 + 10 | telas do protótipo: 2 viram dashboards, 10 viram visões nativas | F-137 |
| 408 h · 12,55 semanas · 6,5 h/dia | estimativa da ETF para um desenvolvedor sênior | F-143, F-144 |
| 13 semanas | cronograma sugerido da ETF | F-145 |
| dezembro de 2026 a abril de 2027 | cronograma do plano, até treinamento e operação assistida | F-170 |
| 11 meses · 7 meses | diagnóstico e redesenho; Etapa 4 de implementação e capacitação | F-164 |
| maio de 2026 | início do uso dos dados de cobrança no modelo de score | F-197 |
| setembro de 2026 | data do plano de implementação | F-163 |
| CQ-AAAA-NNNN · PAR-AAAA-NNNNN | formatos de número do caso e do parcelamento | F-153 |

---

<!-- id: contradictions -->

## Contradições entre fontes

| Tema | Fonte A (ref) | Fonte B (ref) | Como resolver depois |
|------|---------------|----------------|----------------------|
| Score na v1 ou no segundo horizonte | ETF e plano põem o score na v1, como F3 (F-139, F-169, F-067 a F-071) | wiki e protótipo tratam o score como H2, dependente do modelo da UFMT (F-197, INF-003) | Questão 1 — decisão de escopo no `spec-product` |
| Tamanho do grupo de controle | 3% da carteira segmentada (F-151, F-063) | cerca de 500 por ciclo (F-186) | Questão 2 — pode ser compatível (depende do tamanho da carteira); confirmar o parâmetro |
| Regra de distribuição de casos | ETF: por carga ou por grupo de atendentes (F-087, F-093) | wiki: vínculo contador ↔ atendente, balanceamento e prioridade (F-198) | Questão 3 (GAP-009) |
| Cobrança Ativa por telefone | ETF não tem a tela; a fila do atendente é a «Minha Fila» da qualificada (F-137, F-025) | protótipo v3 cria a «Cobrança Ativa — Lista de Ligações» (INF-001) | Questão 4 (GAP-005) |
| Cronograma e equipe | ETF: um desenvolvedor sênior, 13 semanas (F-143, F-145) | plano: squad de dezembro de 2026 a abril de 2027 (F-170) | Questão 7 (GAP-006) — fora do backlog nesta simulação |
| Fonte da lista de contumazes | Explore e ETF: exclusão de contumazes como critério da carteira, alimentado pelas fontes (F-055) | TI: o controle está no sistema Credep (F-178) | Questão 5 (GAP-017) |

---

<!-- id: domain-candidates -->

## Domínios de negócio *(candidatos)*

| Domínio (nome de negócio) | IDs de fatos que sustentam | Lacunas |
|---------------------------|-------------------------------|---------|
| Ingestão e Carteira Consolidada | F-001, F-032 a F-054, F-139, F-148, F-154 a F-157, F-161 a F-162, F-183, F-195 | Contrato definitivo de campos por fonte; janela do ciclo diário |
| Qualificação e Parametrização da Carteira | F-002, F-055 a F-066, F-151, F-178, F-186, F-189, F-193 | Tamanho do grupo de controle (3% × ~500); desempate entre segmentos; fonte de contumazes |
| Scoring de Liquidez | F-003, F-067 a F-071, F-149, F-197 | Score na v1 ou no H2; contrato com a UFMT |
| Réguas de Cobrança Massificada | F-004, F-072 a F-085, F-141, F-150, F-168, F-179, F-192, F-199 | Provedor e contratação do WhatsApp; validação jurídica dos modelos; edição de régua em uso |
| Cobrança Qualificada | F-005, F-086 a F-095, F-153, F-190, F-194, F-196, F-198 | Regra de distribuição (carga/grupo × contador); esteira de estágios do protótipo |
| Monitoramento e KPIs | F-006, F-096 a F-107, F-138, F-147, F-152, F-159 a F-160, F-184 a F-185, F-187 a F-188, F-191 | Licença do Platform Analytics; atribuição com mais de um canal |
| Governança, Acesso e Auditoria | F-007, F-017, F-108 a F-116, F-142, F-158 | Matriz de acesso a validar |
| Plataforma | F-008, F-127 a F-136, F-165 | — |
| Escopo | F-009, F-167, F-169, F-200 | — |
| Atores | F-010 a F-016, F-172 a F-175 | — |
| Telas | F-018 a F-031, F-137 | — |
| Integrações | F-117 a F-126, F-140, F-166, F-176 a F-177, F-180 | — |
| Projeto | F-143 a F-145, F-163 a F-164, F-170 a F-171, F-181 a F-182 | — |
| Dados | F-146 | — |

---

<!-- id: systems-integrations -->

## Sistemas, integrações, contratos mencionados

| Nome | Papel | Protocolo / dado | Fonte (F-xxx) |
|------|-------|------------------|---------------|
| ServiceNow (App Engine, Platform Analytics) | plataforma do produto | aplicação escopada x_cbi_; listas e formulários nativos; dashboards | F-008, F-135, F-138, F-165 |
| Conta Corrente Fiscal (CCF) | fonte de débitos de ICMS e parcelamentos | Scripted REST API, lote incremental por data de alteração | F-117, F-139, F-180 |
| MPI | fonte de elegíveis de ICMS, em descontinuação | Scripted REST API; percentual de migração | F-118, F-161, F-177 |
| Big Data (P2.2) | destino das regras de elegibilidade do MPI | Scripted REST API | F-119, F-177 |
| Sistema IPVA | fonte de débitos de IPVA e opt-in | Scripted REST API | F-120, F-162 |
| GIA-ITCD | fonte de débitos e declarações de ITCD | Scripted REST API | F-121 |
| SNE / DT-e | fonte de débitos e sinalizações coercitivas | Scripted REST API | F-122, F-157 |
| UFMT (modelo de score) | fornece o score de liquidez | Scripted REST API por lote, com versão do modelo | F-123, F-149, F-177 |
| Provedor de e-mail, SMS e WhatsApp | envio das comunicações e status de entrega | REST Message de saída; callback por Scripted REST API | F-124, F-125, F-141, F-179 |
| B-Cadastro e Cadastro de Contadores | dados cadastrais e vínculo contador–contribuinte | APIs prontas, uso não previsto na ETF | F-126, F-180 |
| Credep | controle de contribuintes contumazes | não definido | F-178 |
| SSO da SEFAZ-MT | login dos servidores | autenticação da instância | F-142, F-180 |
| Planilhas e Google Drive | distribuição atual da carteira (processo a substituir) | manual | F-190 |
| SUCOM | consultado pelo atendente para montar o histórico (processo atual) | manual | F-194 |

---

<!-- id: module-capacity-candidates -->

## Candidatos a módulo / capacidade *(opcional — alimenta spec-product Passo 3.0)*

| Rótulo provisório | Fatos (F-xxx) | Colisão com domínio candidato (Passo 5)? | Nota para spec-product 3.0 |
|-------------------|----------------|-------------------------------------------|-----------------------------|
| MOD-INGESTAO — Ingestão e Carteira Consolidada | F-001, F-032 a F-054 | não — mesmo nome | ETF F1 · épico 1 |
| MOD-QUALIFICACAO — Qualificação e Parametrização da Carteira | F-002, F-055 a F-066 | não | ETF F2 · épico 2 |
| MOD-SCORE — Scoring de Liquidez | F-003, F-067 a F-071 | não | ETF F3 · épico 2; decidir v1 × H2 (Questão 1) |
| MOD-REGUAS — Réguas de Cobrança Massificada | F-004, F-072 a F-085 | não | ETF F4 · épico 3 |
| MOD-QUALIFICADA — Cobrança Qualificada | F-005, F-086 a F-095 | não | ETF F5 · épico 4; avaliar a Cobrança Ativa (Questão 4) |
| MOD-MONITORAMENTO — Monitoramento e KPIs | F-006, F-096 a F-107 | não | ETF F6 · épico 5 |
| MOD-GOVERNANCA — Governança, Acesso e Auditoria | F-007, F-108 a F-116 | não | transversal do plano (papéis, mascaramento, auditoria) |

---

<!-- id: actors -->

## Atores e papéis

| Ator / papel | Responsabilidade citada | Frequência de uso | Fonte (F-xxx) |
|---------------|-------------------------|-------------------|----------------|
| Coordenador de Cobrança (CPRF) | define critérios, confirma carteira, gerencia réguas, reatribui casos, vê indicadores; dono do produto na homologação | diária | F-010, F-172 |
| Atendente de Cobrança | trabalha os próprios casos, registra interações; usuário-chave na homologação | diária | F-011, F-173 |
| Gestor de Integração | acompanha lotes, reprocessa rejeitados, acompanha o score | diária | F-012 |
| Auditor | lê versões, auditoria e histórico | eventual | F-013 |
| Administrador da aplicação | administra parâmetros, faixas e metas | eventual | F-014 |
| Sistemas parceiros (usuário de integração por fonte) | enviam lotes pela própria API | diária (por lote) | F-015, F-139 |
| Contribuinte | recebe comunicações; não usa o sistema | — | F-016 |
| UFMT | desenvolve o modelo de score (fora do produto) | por lote | F-123, F-200 |
| TI SEFAZ-MT | responde pelas integrações e disponibiliza acessos e ambientes | projeto | F-166, F-175 |
| SQUAD Cobrança | constrói, mantém o ambiente e corrige defeitos | projeto | F-170, F-174 |
| EloGroup (consultoria) | monta o roteiro e conduz a homologação | projeto | F-174 |

---

<!-- id: pains-metrics -->

## Dores e métricas *(com rasto)*

| Dor ou métrica | Impacto citado | Fonte |
|----------------|-----------------|-------|
| Seleção da carteira empírica | não auditável nem replicável | F-189 |
| Distribuição por planilha e Google Drive | trabalho manual, carga desequilibrada | F-190 |
| Sem visão gerencial em tempo real | indicadores dependem de extração manual | F-191 |
| Disparo com confirmação manual em lote | sem régua estruturada | F-192 |
| Grupo de controle por sorteio manual | não se mede o efeito incremental | F-193 |
| Consulta a vários sistemas antes do contato | atendimento lento e sem contexto | F-194 |
| Status por foto mensal | risco de cobrar quem já regularizou | F-195 |
| Histórico disperso | contatos sem registro por caso | F-196 |
| Crédito recuperado atribuível à cobrança | métrica principal, líquida do grupo de controle | F-187 |
| Regularização espontânea do controle e opt-out por canal | métricas de proteção | F-188 |
| Quitação ICMS Normal ~30,9% e ICMS ST ~22,5% | referência histórica | F-184 |
| Retorno de réguas ~5,15% | referência | F-185 |

---

<!-- id: open-questions -->

## Questões em aberto *(potenciais GAPs — só depois de esgotar fontes; sem criar IDs GAP-XXX aqui)*

| # | Pergunta | Evidência/contexto (F-xxx ou arquivo:linha) | Bloqueia próxima fase? |
|---|----------|-----------------------------------------------|--------------------------|
| 1 | O score de liquidez entra na v1 ou fica para o segundo horizonte? | F-197, F-169, INF-003 | não — o `spec-product` pode tratá-lo com fallback; decide o escopo do MOD-SCORE |
| 2 | O grupo de controle é 3% da carteira ou um número fixo (~500) por ciclo? | F-151, F-186 | não |
| 3 | A distribuição de casos usa vínculo contador ↔ atendente ou só carga e grupo? (gaps.md GAP-009) | F-087, F-093, F-198 | não |
| 4 | A Cobrança Ativa por telefone do protótipo entra na v1? (GAP-005) | INF-001, F-137 | não — muda o tamanho do MOD-QUALIFICADA |
| 5 | De onde vem a lista de contumazes: CCF ou Credep? (GAP-017) | F-178 | não |
| 6 | O Platform Analytics está licenciado? (GAP-002) | F-138, F-131 | não para o backlog; sim para construir os painéis |
| 7 | Cronograma e equipe: um desenvolvedor por 13 semanas ou squad até abril de 2027? (GAP-006) | F-143, F-170 | não nesta simulação (sem horas) |
| 8 | Contrato de campos de cada fonte e respostas da TI sobre MPI, Big Data e UFMT (GAP-001) | F-140, F-177 | não para o backlog; sim para integrar de verdade |
| 9 | Provedor de mensagens, contratação do WhatsApp e validação jurídica dos modelos sob sigilo fiscal (GAP-004, GAP-015) | F-141, F-179 | não para o backlog |
| 10 | O contato-chave editável do protótipo entra no modelo, com base legal para dado pessoal? | INF-004 | não |
| 11 | A matriz de acesso proposta está aprovada? (GAP-003) | F-158 | não |
