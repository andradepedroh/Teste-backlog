# Especificação Funcional — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

> **Fase:** Explore · **Versão:** 0.1 · **Status:** cobertura completa, profundidade preliminar
> **Documentos irmãos:** [HLD](./hld-funcional.md) · [Técnica](./especificacao-tecnica.md) · [Modelo de Dados](./modelo-de-dados.md) · [GAPs](./gaps.md)
>
> Fontes: ETF Cobrança Inteligente (`inputs/especificacoes/etf-cobranca-inteligente.pdf`), wiki TO-BE
> (`inputs/especificacoes/wiki-cobranca-refined/`) e plano de implementação v3
> (`inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx`). As regras RN-001 a RN-012 seguem a
> mesma ordem das regras 1 a 12 do capítulo «Regras & Métricas» da wiki; a RN-013 é a regra de score.

## Changelog
| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-11-13 | versão inicial (simulação do fluxo, sem protótipo) |

## 1. Personas e perfis de acesso

### 1.1 Personas
| Persona | Perfil | Papel no processo |
|---|---|---|
| Coordenador de Cobrança (CPRF) | Coordenador | Define e publica critérios, confirma a carteira, gerencia réguas, reatribui casos e acompanha todos os indicadores |
| Atendente de Cobrança | Atendente | Trabalha só os casos atribuídos a ele: consulta o dossiê, registra interações e follow-ups |
| Gestor de Integração | Gestor de Integração | Acompanha os lotes recebidos de cada fonte, reprocessa rejeitados e acompanha a ingestão do score |
| Auditor | Auditor | Lê versões de critérios, eventos de auditoria e histórico, sem escrever nada |
| Administrador da aplicação | Admin | Administra parâmetros, faixas de score e metas, sem acesso operacional a casos |
| Sistema parceiro (CCF, MPI, Big Data, IPVA, ITCD, SNE/DT-e, UFMT) | Usuário de integração (um por fonte) | Envia lotes pela própria API e não acessa mais nada |
| Contribuinte | — (ator externo) | Recebe as comunicações e regulariza nos canais da SEFAZ; não usa o sistema |

### 1.2 Matriz de acesso
<!-- Proposta da ETF §6.4, marcada pela própria ETF como a validar (ver GAP-003). -->

| Ação | Gestor de Integração | Coordenador | Atendente | Auditor | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Acompanhar fontes, lotes e rejeições | ✅ | ✅ | — | ✅ | ✅ |
| Reprocessar registro rejeitado | ✅ | — | — | — | ✅ |
| Consultar contribuinte, débitos e parcelamentos | ✅ | ✅ | ✅ (só dos próprios casos) | ✅ | ✅ |
| Criar e editar rascunho de critérios | — | ✅ | — | — | — |
| Publicar versão de critérios | — | ✅ | — | — | — |
| Simular e confirmar carteira | — | ✅ | — | — | — |
| Criar e editar réguas, etapas e modelos | — | ✅ | — | — | — |
| Trabalhar casos, registrar interação e follow-up | — | — | ✅ (só os próprios) | — | — |
| Reatribuir casos | — | ✅ | — | — | — |
| Ver Painel Institucional de Cobrança | — | ✅ | — | — | — |
| Ver Painel do Score de Liquidez | ✅ | ✅ | — | — | — |
| Administrar parâmetros, faixas de score e metas | — | — | — | — | ✅ |
| Consultar eventos de auditoria | — | — | — | ✅ | ✅ |

## 2. Navegação e telas
<!-- Sem tela customizada: cada «tela» é um módulo nativo do ServiceNow (lista ou formulário) ou um
     dashboard do Platform Analytics (ETF §6.6). A coluna Rota indica o módulo nativo. -->

| Tela/Aba | Rota | Conteúdo | Visível para |
|---|---|---|---|
| Integrações & Sincronização | Módulo nativo · listas de fontes, lotes e rejeitados | Situação de cada fonte, última carga, lotes, registros rejeitados e reprocesso (RF-001 a RF-008, RF-011, RF-015) | Gestor de Integração |
| Carteira Consolidada | Módulo nativo · lista de posição por tributo com filtros salvos | Contribuintes × tributo com total em aberto, atraso e situação (RF-014) | Coordenador, Gestor de Integração |
| Visão Única do Contribuinte | Formulário nativo do contribuinte com listas relacionadas | Débitos, parcelamentos (com alerta de risco), comunicações e sinalizações do contribuinte (RF-009, RF-010, RF-012, RF-013, RF-052) | Coordenador; Atendente (só dos próprios casos) |
| Critérios de Qualificação | Módulo nativo · lista e formulário de versões de critérios | Rascunho, prévia, publicação e histórico de versões (RF-016, RF-017) | Coordenador |
| Prévia da Carteira Segmentada | Módulo nativo · lista de itens da carteira em simulação | Resultado da simulação: segmento, grupo de controle, confirmação (RF-018 a RF-021, RF-024) | Coordenador |
| Editor de Régua | Formulário nativo da régua com lista de etapas | Etapas, prazos, canais e modelos por segmento; pausar e retomar (RF-026, RF-033) | Coordenador |
| Execução & Status de Disparo | Módulo nativo · listas de réguas e comunicações | Comunicações por canal, consentimento, situação de entrega e reenvio (RF-027 a RF-032, RF-034) | Coordenador, Gestor de Integração |
| Minha Fila | Módulo nativo · lista de casos atribuídos a mim, ordenada por prioridade | Casos do atendente por prioridade (RF-035 a RF-037) | Atendente |
| Dossiê & Caso | Formulário nativo do caso com listas relacionadas | Débitos, interações, follow-ups, sinalizações e vínculos; reatribuição pelo coordenador (RF-038 a RF-041) | Atendente (próprios), Coordenador |
| Regularizações & Origem | Módulo nativo · lista de regularizações com filtros | Regularizações por origem, canal e instrumento (RF-042, RF-043, RF-049) | Coordenador |
| Painel Institucional de Cobrança | Dashboard do Platform Analytics | Funil, KPIs, tendência cobrada × controle, retorno das réguas, realizado × meta e alerta de meta (RF-044 a RF-048) | Coordenador |
| Painel do Score de Liquidez | Dashboard do Platform Analytics | Cobertura, score médio, faixas e últimos lotes (RF-022, RF-023, RF-025) | Gestor de Integração, Coordenador |
| Parâmetros, faixas de score e metas | Módulo nativo · listas e formulários de parâmetros, faixas e metas | Parâmetros gerais (prazos, janela de atribuição, limite de reenvio), faixas de score e metas por tributo, com histórico de alterações (RF-023, RF-053, RF-054) | Admin |
| Auditoria | Módulo nativo · listas de eventos de auditoria e de versões de critérios | Eventos de auditoria, versões publicadas, exportações registradas (RF-050, RF-051, RF-055) | Auditor, Admin |

## 3. Funcionalidades e regras de negócio, por módulo

### MOD-INGESTAO — Ingestão e Carteira Consolidada

**Funcionalidades**

| ID | Funcionalidade | Descrição |
|---|---|---|
| RF-001 | Receber débitos por API | Receber os débitos de CCF, MPI, Big Data, IPVA, ITCD e SNE/DT-e por uma API por fonte, com o mesmo padrão de abrir lote, enviar pacotes e fechar lote |
| RF-002 | Validar documento do contribuinte | Conferir o dígito verificador do CPF/CNPJ, guardar só os dígitos e devolver na resposta da API cada registro rejeitado com o motivo |
| RF-003 | Consolidar por contribuinte | Vincular débitos de fontes diferentes ao mesmo contribuinte e manter gravada a posição por tributo |
| RF-004 | Evitar duplicidade no reenvio | Reenviar o mesmo pacote ou registro não duplica débito, parcelamento nem sinalização |
| RF-005 | Fechar o ciclo diário e acompanhar fontes | No prazo de cada fonte, marcar quem não entregou, consolidar o que chegou e mostrar a situação e a última carga de cada fonte |
| RF-006 | Seguir operando com fonte em falha | Falha de uma fonte abre alerta e mantém a última carga válida dela, sem parar as outras |
| RF-007 | Carga inicial e reconciliação | Receber o histórico pelas mesmas APIs e conferir os totais por fonte e por tributo |
| RF-008 | Reprocessar rejeitados | Reaplicar a validação sobre o registro guardado, sem pedir novo envio à fonte |
| RF-009 | Atualizar regularização no ciclo | Atualizar regularização e parcelamento durante o ciclo e encerrar caso e régua de quem regularizou |
| RF-010 | Alertar parcelamento em risco | Marcar como em risco o parcelamento com parcela vencida |
| RF-011 | Transição MPI → Big Data | Receber as duas fontes durante a transição, sem duplicar débito, e registrar o percentual de regras migradas |
| RF-012 | Receber sinalização coercitiva | Receber pela SNE/DT-e as sinalizações de cobrança coercitiva de outras coordenadorias e exibi-las só como informação |
| RF-013 | Visão única do contribuinte | Mostrar num formulário único os débitos, parcelamentos, comunicações e sinalizações do contribuinte |
| RF-014 | Carteira consolidada | Listar a posição contribuinte × tributo com filtros salvos por tributo, atraso, valor e situação |
| RF-015 | Simular cargas das fontes | Gerar lotes simulados por fonte, inclusive inválidos e repetidos, para testar as APIs enquanto os parceiros não estão disponíveis |

**Regras de negócio**

| ID | Regra | Afeta |
|---|---|---|
| RN-001 | Débitos de fontes diferentes com o mesmo CPF/CNPJ pertencem a um único contribuinte; a sobreposição entre fontes é resolvida por regra | RF-003, RF-011, RF-013 |
| RN-002 | Ao detectar regularização durante o ciclo, o caso e a régua do contribuinte se encerram e ele não é mais abordado naquele ciclo | RF-009, RF-027, RF-035 |
| RN-012 | A identificação de débitos continua funcionando na transição do MPI para o Big Data, sem ruptura da carteira | RF-011 |
| RN-014 | Registro com CPF/CNPJ inválido é rejeitado e devolvido ao parceiro na resposta da API | RF-002, RF-008 |
| RN-015 | O mesmo lote ou registro enviado de novo não gera duplicidade; o controle é por fonte, lote e sequência do pacote | RF-004 |
| RN-016 | A falha de uma fonte não interrompe as demais; vale a última carga válida da fonte que falhou | RF-005, RF-006 |
| RN-017 | Sinalização de cobrança coercitiva de outra coordenadoria é só informativa; o produto nunca age sobre ela | RF-012, RF-038 |
| RN-018 | Somente as APIs de ingestão gravam dados de contribuinte, débito, parcelamento, posição, vínculo e sinalização; nenhum papel humano escreve nesses dados | RF-001, RF-050 |

### MOD-QUALIFICACAO — Qualificação e Parametrização da Carteira

**Funcionalidades**

| ID | Funcionalidade | Descrição |
|---|---|---|
| RF-016 | Parametrizar critérios | Definir os critérios da carteira: valor, tributo, atraso, instrumento, exclusão de contumazes e limite de score |
| RF-017 | Versionar critérios | Manter versões numeradas, com um único rascunho aberto; publicar exige fundamentação e prévia vigente |
| RF-018 | Simular a carteira | Gerar a prévia da carteira a partir do rascunho, sem efeito sobre a operação |
| RF-019 | Segmentar massificada × qualificada | Classificar cada contribuinte da carteira no segmento definido pela versão |
| RF-020 | Sortear grupo de controle | Sortear o grupo de controle a cada ciclo, de forma que o sorteio possa ser refeito |
| RF-021 | Confirmar a carteira | Confirmar a carteira de uma versão publicada, o que libera as réguas e cria os casos |

**Regras de negócio**

| ID | Regra | Afeta |
|---|---|---|
| RN-003 | Os critérios de carteira são configuráveis, versionados e auditáveis; a seleção não depende de conhecimento tácito | RF-016, RF-017 |
| RN-004 | A carteira se divide entre massificada e qualificada, e o contribuinte segue um único eixo por ciclo (o desempate está no GAP-007) | RF-019, RF-027, RF-035 |
| RN-009 | Um grupo de controle, por padrão 3% da carteira segmentada, é sorteado a cada ciclo com semente gravada, não é cobrado e serve de base para medir o efeito incremental | RF-020, RF-045 |
| RN-019 | Os critérios se combinam por E; o limite de score se aplica só a quem tem score | RF-016, RF-018 |
| RN-020 | Versão publicada e carteira confirmada não podem ser alteradas nem excluídas; mudar critérios cria nova versão, que nasce da última publicada | RF-017, RF-021 |
| RN-021 | A prévia deixa de valer se os parâmetros mudarem; a confirmação só aceita versão publicada | RF-017, RF-018, RF-021 |

### MOD-SCORE — Scoring de Liquidez

**Funcionalidades**

| ID | Funcionalidade | Descrição |
|---|---|---|
| RF-022 | Receber score da UFMT | Receber o score por lote, vincular ao contribuinte pelo documento e registrar a versão do modelo |
| RF-023 | Classificar em faixas | Classificar o score em faixas parametrizáveis |
| RF-024 | Operar sem score | Tratar o contribuinte sem score pelos critérios determinísticos, na qualificação e na fila |
| RF-025 | Painel do Score | Mostrar cobertura por tributo, score médio, distribuição por faixa e últimos lotes recebidos |

**Regras de negócio**

| ID | Regra | Afeta |
|---|---|---|
| RN-013 | O score da UFMT é consumido, nunca calculado pelo produto; quando falta ou está indisponível, a qualificação e a priorização usam só os critérios determinísticos | RF-022, RF-024, RF-016, RF-037 |

### MOD-REGUAS — Réguas de Cobrança Massificada

**Funcionalidades**

| ID | Funcionalidade | Descrição |
|---|---|---|
| RF-026 | Montar régua | Cadastrar régua por segmento, com etapas ordenadas por prazo, canal e modelo de mensagem com variáveis |
| RF-027 | Enviar a etapa devida | Calcular diariamente a etapa devida de cada contribuinte e enviar sem confirmação manual |
| RF-028 | Escalonar e encaminhar | Escalonar quando não há resposta, encerrar quando regulariza e encaminhar à cobrança qualificada quem esgotou a régua |
| RF-029 | Respeitar consentimento | Conferir opt-in e opt-out do canal no momento do envio |
| RF-030 | Enviar por canal | Enviar por e-mail, SMS ou WhatsApp pelo provedor contratado, podendo trocar de provedor |
| RF-031 | Receber status de entrega | Receber do provedor o status de cada comunicação e atualizá-lo sem duplicar |
| RF-032 | Reenviar falhas | Reenviar a comunicação que falhou até o limite de tentativas |
| RF-033 | Pausar e retomar régua | Interromper a criação de novas comunicações sem cancelar as já enviadas |
| RF-034 | Acompanhar execução | Listar comunicações por régua, canal e situação |

**Regras de negócio**

| ID | Regra | Afeta |
|---|---|---|
| RN-005 | A régua escalona conforme o comportamento: sem resposta, renotifica e intensifica; com regularização, encerra | RF-027, RF-028 |
| RN-006 | Só recebe mensagem no canal quem tem opt-in vigente; o opt-out vale imediatamente e fica registrado | RF-029, RF-030 |
| RN-022 | Cada segmento tem uma única régua ativa; etapas não se repetem e o modelo só usa variáveis existentes | RF-026 |
| RN-023 | Comunicação em falha é reenviada até o limite de tentativas definido em parâmetro | RF-032 |
| RN-024 | Pausar a régua não cancela as comunicações já enviadas | RF-033 |

### MOD-QUALIFICADA — Cobrança Qualificada

**Funcionalidades**

| ID | Funcionalidade | Descrição |
|---|---|---|
| RF-035 | Criar casos | Criar o caso (numeração CQ-ano-sequencial) a partir da carteira confirmada ou do esgotamento da régua |
| RF-036 | Distribuir casos | Atribuir os casos aos atendentes por carga de trabalho ou por grupo |
| RF-037 | Fila priorizada | Mostrar ao atendente os próprios casos ordenados por prioridade (score, valor e atraso) |
| RF-038 | Dossiê do caso | Reunir no formulário do caso débitos, parcelamentos, interações, follow-ups, sinalizações e vínculos econômicos |
| RF-039 | Registrar interação | Registrar cada contato com o contribuinte, sem possibilidade de alterar ou excluir depois |
| RF-040 | Follow-up com lembrete | Agendar follow-up com data e notificar o atendente no dia |
| RF-041 | Reatribuir casos | Permitir ao coordenador reatribuir casos entre atendentes |

**Regras de negócio**

| ID | Regra | Afeta |
|---|---|---|
| RN-007 | Os casos são distribuídos automaticamente por regra (carga, grupo, prioridade), sem planilha | RF-036, RF-041 |
| RN-010 | Toda ação relevante (disparo, distribuição, alteração de regra ou régua, encerramento de caso, interação) fica registrada com autor e data, e não pode ser alterada | RF-039, RF-053 |
| RN-025 | A prioridade da fila usa score, valor e atraso; sem score, usa só valor e atraso | RF-037 |

### MOD-MONITORAMENTO — Monitoramento e KPIs

**Funcionalidades**

| ID | Funcionalidade | Descrição |
|---|---|---|
| RF-042 | Marcar notificado e regularizado | Marcar o item da carteira como notificado ao enviar comunicação ou registrar interação, e como regularizado ao registrar a regularização |
| RF-043 | Atribuir origem da regularização | Classificar cada regularização como espontânea ou resposta à cobrança, por canal e instrumento |
| RF-044 | Indicadores de funil | Contar identificados, notificados e regularizados, e somar o crédito recuperado |
| RF-045 | Efeito incremental | Calcular a taxa de regularização da carteira cobrada, a do grupo de controle e a diferença em pontos percentuais |
| RF-046 | Retorno das réguas | Calcular a parcela das comunicações pagas em até 30 dias |
| RF-047 | Realizado × meta | Comparar a taxa realizada com a meta por tributo e alertar meta não atingida |
| RF-048 | Painel Institucional | Mostrar funil, KPIs com variação, tendência cobrada × controle e tabela por tributo com meta |
| RF-049 | Regularizações por origem | Listar as regularizações com filtros por origem, canal e instrumento |

**Regras de negócio**

| ID | Regra | Afeta |
|---|---|---|
| RN-008 | Toda regularização é marcada quanto à origem: espontânea ou resposta à cobrança | RF-043, RF-049 |
| RN-011 | O coordenador vê toda a carteira e os comparativos; o atendente vê só os próprios casos, sem comparativo e sem dashboards | RF-048, RF-037, RF-051 |
| RN-026 | A regularização conta como resposta à cobrança quando há contato de cobrança na janela parametrizável (padrão de 30 dias); no grupo de controle ela é sempre espontânea | RF-043, RF-045 |
| RN-027 | Os indicadores são calculados direto das tabelas da aplicação, sem tabela de fotografia; a coleta diária forma o histórico | RF-044 a RF-048 |

### MOD-GOVERNANCA — Governança, Acesso e Auditoria

**Funcionalidades**

| ID | Funcionalidade | Descrição |
|---|---|---|
| RF-050 | Controlar acesso por papel | Aplicar a matriz de acesso dos cinco papéis na camada de dados, a cada consulta |
| RF-051 | Isolar a visão do atendente | Garantir que o atendente leia só os próprios casos e os dados do contribuinte desses casos |
| RF-052 | Mascarar CPF e restringir exportação | Mascarar o CPF de pessoa física por padrão e permitir exportação só a papéis autorizados, registrando cada uma |
| RF-053 | Auditar ações e parâmetros | Registrar eventos de auditoria e as alterações de parâmetros, metas e faixas de score com valor anterior, valor novo, autor e vigência |
| RF-054 | Administrar parâmetros | Manter parâmetros gerais, faixas de score e metas por tributo e ciclo |
| RF-055 | Consultar auditoria | Permitir ao auditor ler versões, eventos de auditoria e histórico, sem escrita |

**Regras de negócio**

| ID | Regra | Afeta |
|---|---|---|
| RN-028 | O controle de acesso vale na camada de dados; esconder menu ou módulo não basta | RF-050, RF-051 |
| RN-029 | O CPF de pessoa física aparece mascarado por padrão, e toda exportação fica registrada | RF-052 |
| RN-030 | Evento de auditoria não pode ser alterado nem excluído por nenhum papel | RF-053, RF-055 |
