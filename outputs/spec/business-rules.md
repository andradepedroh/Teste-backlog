# Regras de Negócio — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: 2026-11-13
Total de RN: 0 legado · 32 novo produto
Fonte: context-map.md (F-xxx, inclusive as regras RN-nnn do Explore ancoradas em `especificacao-funcional.md §3`), discovery-document.md, ETF

> **Seção A — Regras do Legado:** omitida. O projeto não tem legado (`legacy.md` em modo skip).

---

## Seção B — Regras do Novo Produto

Cada regra abaixo promove uma regra preliminar do Explore (`RN-nnn`, citada na linha **Origem**) ou
uma regra de cálculo que a ETF detalha. O tipo segue a classificação de regras de negócio (Fato,
Restrição, Derivação, Inferência ou Gatilho); toda regra de Derivação traz o algoritmo em passos.

<!-- id: br-new -->


### Domínio: Ingestão e Carteira Consolidada

#### RN-NOVO-ING-001: Consolidação por contribuinte

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-INGESTAO |
| **Origem** | F-047 — regra RN-001 do Explore (`especificacao-funcional.md §3 MOD-INGESTAO RN-001`) |
| **Domínio** | Ingestão e Carteira Consolidada |
| **Tipo** | Derivação |
| **Enunciado** | SE dois débitos de fontes diferentes têm o mesmo CPF/CNPJ normalizado ENTÃO pertencem ao mesmo contribuinte e entram na mesma posição por tributo |
| **Algoritmo** | 1. Normalizar o documento recebido para somente dígitos. 2. Procurar o contribuinte com esse documento; se não existir, criar. 3. Vincular o débito ao contribuinte. 4. Recalcular a posição do tributo: soma do valor em aberto, maior atraso e quantidade de débitos. 5. Atualizar o total em aberto e o maior atraso do contribuinte. |
| **Exceções** | Débito de fonte em transição MPI → Big Data com a mesma chave natural conta uma vez só (ver RN-NOVO-ING-003) |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-INGESTAO-03, RF-MOD-INGESTAO-13 |
| **Justificativa** | É a base da visão única do contribuinte |

---

#### RN-NOVO-ING-002: Regularização encerra a abordagem no ciclo

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-INGESTAO |
| **Origem** | F-048 — regra RN-002 do Explore (`especificacao-funcional.md §3 MOD-INGESTAO RN-002`) |
| **Domínio** | Ingestão e Carteira Consolidada |
| **Tipo** | Gatilho |
| **Enunciado** | SE a carga do dia mostra o débito regularizado ENTÃO o sistema encerra o caso e a régua do contribuinte e não o aborda mais naquele ciclo |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | Contribuinte com outros débitos ainda em aberto continua na carteira por eles |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-INGESTAO-09, RF-MOD-QUALIFICADA-01, RF-MOD-REGUAS-02 |
| **Justificativa** | Evita cobrar quem já pagou (dor da foto mensal) |

---

#### RN-NOVO-ING-003: Continuidade na transição MPI → Big Data

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-INGESTAO |
| **Origem** | F-049 — regra RN-012 do Explore (`especificacao-funcional.md §3 MOD-INGESTAO RN-012`) |
| **Domínio** | Ingestão e Carteira Consolidada |
| **Tipo** | Restrição |
| **Enunciado** | SE o mesmo débito chega pelo MPI e pelo Big Data ENTÃO o sistema mantém um único débito, sem ruptura da carteira |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-INGESTAO-11 |
| **Justificativa** | O MPI será descontinuado e o Big Data assume as regras de elegibilidade |

---

#### RN-NOVO-ING-004: Rejeição de documento inválido

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-INGESTAO |
| **Origem** | F-050 — regra RN-014 do Explore (`especificacao-funcional.md §3 MOD-INGESTAO RN-014`) |
| **Domínio** | Ingestão e Carteira Consolidada |
| **Tipo** | Restrição |
| **Enunciado** | SE o CPF/CNPJ do registro tem dígito verificador inválido ENTÃO o sistema rejeita o registro e devolve o motivo na resposta ao parceiro |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-INGESTAO-02, RF-MOD-INGESTAO-08, RF-MOD-INGESTAO-15 |
| **Justificativa** | Impede contribuinte fantasma na base |

---

#### RN-NOVO-ING-005: Reenvio não duplica

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-INGESTAO |
| **Origem** | F-051 — regra RN-015 do Explore (`especificacao-funcional.md §3 MOD-INGESTAO RN-015`) |
| **Domínio** | Ingestão e Carteira Consolidada |
| **Tipo** | Restrição |
| **Enunciado** | SE um lote ou registro já recebido chega de novo, pela mesma fonte, com o mesmo identificador ENTÃO o sistema não cria débito, parcelamento nem sinalização em duplicidade |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | Reprocesso de rejeitado gera nova tentativa, ligada ao lote original |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-INGESTAO-04, RF-MOD-INGESTAO-07, RF-MOD-INGESTAO-15 |
| **Justificativa** | As fontes reenviam pacotes em caso de falha de comunicação |

---

#### RN-NOVO-ING-006: Falha de uma fonte não para as outras

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-INGESTAO |
| **Origem** | F-052 — regra RN-016 do Explore (`especificacao-funcional.md §3 MOD-INGESTAO RN-016`) |
| **Domínio** | Ingestão e Carteira Consolidada |
| **Tipo** | Restrição |
| **Enunciado** | SE uma fonte não entrega no prazo ou falha ENTÃO o sistema marca a fonte em falha, abre alerta, mantém a última carga válida dela e consolida as demais |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-INGESTAO-05, RF-MOD-INGESTAO-06 |
| **Justificativa** | Uma fonte fora do ar não pode travar a cobrança inteira |

---

#### RN-NOVO-ING-007: Sinalização coercitiva é só informativa

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-INGESTAO |
| **Origem** | F-053 — regra RN-017 do Explore (`especificacao-funcional.md §3 MOD-INGESTAO RN-017`) |
| **Domínio** | Ingestão e Carteira Consolidada |
| **Tipo** | Restrição |
| **Enunciado** | SE o contribuinte tem sinalização de cobrança coercitiva de outra coordenadoria ENTÃO o sistema mostra a sinalização e não executa nenhuma ação sobre ela |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-INGESTAO-12, RF-MOD-QUALIFICADA-04 |
| **Justificativa** | Protesto e inscrição são de outra coordenadoria e de outro produto |

---

#### RN-NOVO-ING-008: Só a carga grava dados de origem

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-INGESTAO |
| **Origem** | F-054 — regra RN-018 do Explore (`especificacao-funcional.md §3 MOD-INGESTAO RN-018`) |
| **Domínio** | Ingestão e Carteira Consolidada |
| **Tipo** | Restrição |
| **Enunciado** | SE o dado é de contribuinte, débito, parcelamento, posição, vínculo ou sinalização ENTÃO só a carga das fontes o grava; nenhum usuário o edita |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-GOVERNANCA-01, RF-MOD-INGESTAO-01 |
| **Justificativa** | Garante que a visão única reflita as fontes oficiais |

---


### Domínio: Qualificação e Parametrização da Carteira

#### RN-NOVO-QUA-001: Critérios configuráveis e versionados

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-QUALIFICACAO |
| **Origem** | F-061 — regra RN-003 do Explore (`especificacao-funcional.md §3 MOD-QUALIFICACAO RN-003`) |
| **Domínio** | Qualificação e Parametrização da Carteira |
| **Tipo** | Restrição |
| **Enunciado** | SE a carteira é formada ENTÃO ela usa uma versão publicada de critérios, numerada e auditável |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-QUALIFICACAO-01, RF-MOD-QUALIFICACAO-02 |
| **Justificativa** | Seleção deixa de depender do conhecimento tácito de quem coordena |

---

#### RN-NOVO-QUA-002: Um eixo por contribuinte no ciclo

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-QUALIFICACAO |
| **Origem** | F-062 — regra RN-004 do Explore (`especificacao-funcional.md §3 MOD-QUALIFICACAO RN-004`) |
| **Domínio** | Qualificação e Parametrização da Carteira |
| **Tipo** | Restrição |
| **Enunciado** | SE o contribuinte entra na carteira ENTÃO ele fica em um único segmento (massificada ou qualificada) naquele ciclo, conforme o tipo-alvo da versão |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | Desempate entre os dois segmentos ainda não definido (QA-01) |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-QUALIFICACAO-04, RF-MOD-QUALIFICADA-01, RF-MOD-REGUAS-02 |
| **Justificativa** | Estratégias e custos diferentes por eixo |

---

#### RN-NOVO-QUA-003: Sorteio do grupo de controle

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-QUALIFICACAO |
| **Origem** | F-063 — regra RN-009 do Explore (`especificacao-funcional.md §3 MOD-QUALIFICACAO RN-009`) |
| **Domínio** | Qualificação e Parametrização da Carteira |
| **Tipo** | Derivação |
| **Enunciado** | SE a carteira do ciclo é segmentada ENTÃO o sistema sorteia o grupo de controle, que não é cobrado |
| **Algoritmo** | 1. Ler o percentual do parâmetro do grupo de controle (padrão 3%). 2. Gerar e gravar a semente do sorteio na carteira. 3. Ordenar os itens da carteira de forma reproduzível a partir da semente. 4. Marcar como controle os primeiros itens até atingir o percentual, arredondando para cima. 5. Excluir os itens de controle das réguas e da criação de casos. |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-MONITORAMENTO-04, RF-MOD-QUALIFICACAO-05 |
| **Justificativa** | Permite medir o efeito incremental (decisão de Pedro em 2026-11-13: 3%) |

---

#### RN-NOVO-QUA-004: Aplicação dos critérios

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-QUALIFICACAO |
| **Origem** | F-064 — regra RN-019 do Explore (`especificacao-funcional.md §3 MOD-QUALIFICACAO RN-019`) |
| **Domínio** | Qualificação e Parametrização da Carteira |
| **Tipo** | Derivação |
| **Enunciado** | SE uma versão de critérios é simulada ou confirmada ENTÃO o contribuinte entra na carteira só quando atende a todos os critérios |
| **Algoritmo** | 1. Partir da posição por tributo de todos os contribuintes. 2. Manter quem atende ao valor mínimo, ao tributo, ao atraso mínimo e ao instrumento da versão. 3. Retirar os contribuintes contumazes quando a versão pede a exclusão. 4. Aplicar o limite de score só a quem tem score vigente; quem não tem segue sem esse filtro. 5. Processar em lotes e gravar os itens da carteira com o segmento-alvo. |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-QUALIFICACAO-01, RF-MOD-QUALIFICACAO-03 |
| **Justificativa** | Seleção replicável |

---

#### RN-NOVO-QUA-005: Versão publicada e carteira confirmada são imutáveis

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-QUALIFICACAO |
| **Origem** | F-065 — regra RN-020 do Explore (`especificacao-funcional.md §3 MOD-QUALIFICACAO RN-020`) |
| **Domínio** | Qualificação e Parametrização da Carteira |
| **Tipo** | Restrição |
| **Enunciado** | SE a versão foi publicada ou a carteira foi confirmada ENTÃO ninguém pode alterá-la nem excluí-la; mudar critérios cria nova versão a partir da última publicada |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-QUALIFICACAO-02, RF-MOD-QUALIFICACAO-06 |
| **Justificativa** | Auditoria da seleção |

---

#### RN-NOVO-QUA-006: Prévia vigente para publicar

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-QUALIFICACAO |
| **Origem** | F-066 — regra RN-021 do Explore (`especificacao-funcional.md §3 MOD-QUALIFICACAO RN-021`) |
| **Domínio** | Qualificação e Parametrização da Carteira |
| **Tipo** | Gatilho |
| **Enunciado** | SE os parâmetros do rascunho mudam depois da prévia ENTÃO a prévia deixa de valer e a publicação fica bloqueada até nova prévia |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-QUALIFICACAO-02, RF-MOD-QUALIFICACAO-03, RF-MOD-QUALIFICACAO-06 |
| **Justificativa** | Ninguém publica critérios sem ver o efeito |

---


### Domínio: Scoring de Liquidez

#### RN-NOVO-SCO-001: Fallback sem score

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-SCORE |
| **Origem** | F-071 — regra RN-013 do Explore (`especificacao-funcional.md §3 MOD-SCORE RN-013`) |
| **Domínio** | Scoring de Liquidez |
| **Tipo** | Restrição |
| **Enunciado** | SE o contribuinte não tem score vigente ou o score está indisponível ENTÃO a qualificação e a priorização usam só os critérios determinísticos |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-QUALIFICADA-03, RF-MOD-SCORE-01, RF-MOD-SCORE-03 |
| **Justificativa** | O score entra na v1 sem travar a operação (decisão de Pedro em 2026-11-13) |

---

#### RN-NOVO-SCO-002: Classificação do score em faixas

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-SCORE |
| **Origem** | F-068 — ETF §2.1 e §6, detalhamento da regra de cálculo |
| **Domínio** | Scoring de Liquidez |
| **Tipo** | Derivação |
| **Enunciado** | SE um score é recebido ENTÃO o sistema o classifica na faixa cujos limites o contêm |
| **Algoritmo** | 1. Ler as faixas vigentes (nome, limite inferior e limite superior). 2. Encontrar a faixa em que o valor do score (0 a 1) cai, com o limite inferior incluído. 3. Gravar a faixa no score e marcar este score como o vigente do contribuinte. 4. Se nenhuma faixa contém o valor, deixar sem faixa e registrar alerta para o Gestor de Integração. |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-SCORE-02 |
| **Justificativa** | Faixas parametrizáveis pedidas na ETF |

---


### Domínio: Réguas de Cobrança Massificada

#### RN-NOVO-REG-001: Reenvio limitado

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-REGUAS |
| **Origem** | F-084 — regra RN-023 do Explore (`especificacao-funcional.md §3 MOD-REGUAS RN-023`) |
| **Domínio** | Réguas de Cobrança Massificada |
| **Tipo** | Restrição |
| **Enunciado** | SE a comunicação falha ENTÃO o sistema tenta de novo até o limite de tentativas do parâmetro |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-REGUAS-07 |
| **Justificativa** | Evita perder comunicação por falha momentânea sem insistir indefinidamente |

---

#### RN-NOVO-REG-002: Escalonamento da régua

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-REGUAS |
| **Origem** | F-081 — regra RN-005 do Explore (`especificacao-funcional.md §3 MOD-REGUAS RN-005`) |
| **Domínio** | Réguas de Cobrança Massificada |
| **Tipo** | Gatilho |
| **Enunciado** | SE o prazo da próxima etapa venceu e o contribuinte não regularizou ENTÃO o sistema envia a etapa seguinte; SE regularizou ENTÃO encerra a régua |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | Contribuinte que esgotou a régua sem regularizar vai para a cobrança qualificada |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-REGUAS-02, RF-MOD-REGUAS-03 |
| **Justificativa** | Aumenta a percepção de risco de forma progressiva |

---

#### RN-NOVO-REG-003: Consentimento por canal

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-REGUAS |
| **Origem** | F-082 — regra RN-006 do Explore (`especificacao-funcional.md §3 MOD-REGUAS RN-006`) |
| **Domínio** | Réguas de Cobrança Massificada |
| **Tipo** | Restrição |
| **Enunciado** | SE o contribuinte não tem opt-in vigente no canal ENTÃO o sistema não envia por esse canal; o opt-out vale na hora |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-REGUAS-04, RF-MOD-REGUAS-05 |
| **Justificativa** | Base legal e relacionamento com o contribuinte |

---

#### RN-NOVO-REG-004: Régua consistente

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-REGUAS |
| **Origem** | F-083 — regra RN-022 do Explore (`especificacao-funcional.md §3 MOD-REGUAS RN-022`) |
| **Domínio** | Réguas de Cobrança Massificada |
| **Tipo** | Restrição |
| **Enunciado** | SE uma régua é salva ENTÃO ela é a única ativa do segmento, não repete etapa e o modelo só usa variáveis existentes |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-REGUAS-01 |
| **Justificativa** | Evita envio duplicado ou mensagem quebrada |

---

#### RN-NOVO-REG-005: Pausa não cancela o enviado

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-REGUAS |
| **Origem** | F-085 — regra RN-024 do Explore (`especificacao-funcional.md §3 MOD-REGUAS RN-024`) |
| **Domínio** | Réguas de Cobrança Massificada |
| **Tipo** | Restrição |
| **Enunciado** | SE a régua é pausada ENTÃO o sistema para de criar comunicações e mantém as já enviadas |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-REGUAS-08 |
| **Justificativa** | Controle operacional sem perda de histórico |

---


### Domínio: Cobrança Qualificada

#### RN-NOVO-CQ-001: Distribuição automática

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-QUALIFICADA |
| **Origem** | F-093 — regra RN-007 do Explore (`especificacao-funcional.md §3 MOD-QUALIFICADA RN-007`) |
| **Domínio** | Cobrança Qualificada |
| **Tipo** | Derivação |
| **Enunciado** | SE um caso é criado ENTÃO o sistema o atribui a um atendente por carga de trabalho ou por grupo |
| **Algoritmo** | 1. Identificar o grupo de atendentes configurado para o segmento ou tributo do caso. 2. Contar os casos abertos de cada atendente ativo do grupo. 3. Atribuir ao atendente com menos casos abertos; em empate, ao que recebeu caso há mais tempo. 4. Registrar a atribuição no histórico do caso. |
| **Exceções** | Vínculo contador ↔ atendente fora da v1 (decisão de Pedro em 2026-11-13) |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-QUALIFICADA-02, RF-MOD-QUALIFICADA-07 |
| **Justificativa** | Elimina a planilha de distribuição |

---

#### RN-NOVO-CQ-002: Ações auditáveis e imutáveis

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-QUALIFICADA |
| **Origem** | F-094 — regra RN-010 do Explore (`especificacao-funcional.md §3 MOD-QUALIFICADA RN-010`) |
| **Domínio** | Cobrança Qualificada |
| **Tipo** | Restrição |
| **Enunciado** | SE uma interação, disparo, distribuição, alteração de régua ou encerramento de caso é registrado ENTÃO o registro guarda autor e data e não pode ser alterado nem excluído |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-GOVERNANCA-04, RF-MOD-QUALIFICADA-05, RF-MOD-QUALIFICADA-07 |
| **Justificativa** | Cobrança auditável e defensável |

---

#### RN-NOVO-CQ-003: Prioridade da fila

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-QUALIFICADA |
| **Origem** | F-095 — regra RN-025 do Explore (`especificacao-funcional.md §3 MOD-QUALIFICADA RN-025`) |
| **Domínio** | Cobrança Qualificada |
| **Tipo** | Derivação |
| **Enunciado** | SE o caso está aberto ENTÃO a prioridade dele é calculada por score, valor e atraso |
| **Algoritmo** | 1. Normalizar o valor em aberto do contribuinte numa escala de 0 a 1 dentro da carteira do ciclo. 2. Normalizar o maior atraso numa escala de 0 a 1. 3. Se há score vigente: prioridade = média de score, valor e atraso. 4. Se não há score: prioridade = média de valor e atraso. 5. Ordenar a fila do atendente pela prioridade, da maior para a menor. |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-QUALIFICADA-03 |
| **Justificativa** | O atendente começa pelo caso com maior chance de recuperação |

---


### Domínio: Monitoramento e KPIs

#### RN-NOVO-MON-001: Origem da regularização

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-MONITORAMENTO |
| **Origem** | F-104 — regra RN-008 do Explore (`especificacao-funcional.md §3 MOD-MONITORAMENTO RN-008`) |
| **Domínio** | Monitoramento e KPIs |
| **Tipo** | Fato |
| **Enunciado** | SE uma regularização é registrada ENTÃO ela recebe uma origem: espontânea ou resposta à cobrança, com canal e instrumento |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-MONITORAMENTO-02, RF-MOD-MONITORAMENTO-08 |
| **Justificativa** | Base da medição causal |

---

#### RN-NOVO-MON-002: Visibilidade por perfil

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-MONITORAMENTO |
| **Origem** | F-105 — regra RN-011 do Explore (`especificacao-funcional.md §3 MOD-MONITORAMENTO RN-011`) |
| **Domínio** | Monitoramento e KPIs |
| **Tipo** | Restrição |
| **Enunciado** | SE o usuário é atendente ENTÃO vê só os próprios casos, sem comparativo e sem painéis; SE é coordenador ENTÃO vê toda a carteira e os comparativos |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-GOVERNANCA-02, RF-MOD-MONITORAMENTO-07, RF-MOD-QUALIFICADA-03, RF-MOD-SCORE-04 |
| **Justificativa** | Governança e privacidade interna |

---

#### RN-NOVO-MON-003: Atribuição da origem

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-MONITORAMENTO |
| **Origem** | F-106 — regra RN-026 do Explore (`especificacao-funcional.md §3 MOD-MONITORAMENTO RN-026`) |
| **Domínio** | Monitoramento e KPIs |
| **Tipo** | Derivação |
| **Enunciado** | SE uma regularização é registrada ENTÃO a origem é calculada pela existência de contato de cobrança na janela de atribuição |
| **Algoritmo** | 1. Se o item da carteira é do grupo de controle: origem espontânea. 2. Ler a janela de atribuição do parâmetro (padrão 30 dias). 3. Procurar comunicação entregue ou interação registrada nos dias da janela antes da regularização. 4. Se encontrou: origem resposta à cobrança, com o canal do contato mais recente; senão: espontânea. 5. Se a origem é uma comunicação, marcá-la como paga em até 30 dias. |
| **Exceções** | Atribuição com mais de um canal ainda em aberto (GAP-008): vale o contato mais recente |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-MONITORAMENTO-02, RF-MOD-MONITORAMENTO-04, RF-MOD-MONITORAMENTO-05 |
| **Justificativa** | Distingue o efeito da cobrança da regularização que aconteceria de qualquer forma |

---

#### RN-NOVO-MON-004: Indicadores direto das tabelas

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-MONITORAMENTO |
| **Origem** | F-107 — regra RN-027 do Explore (`especificacao-funcional.md §3 MOD-MONITORAMENTO RN-027`) |
| **Domínio** | Monitoramento e KPIs |
| **Tipo** | Fato |
| **Enunciado** | SE um indicador é calculado ENTÃO ele usa os dados das tabelas da aplicação, e a coleta diária forma o histórico |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-MONITORAMENTO-01, RF-MOD-MONITORAMENTO-03, RF-MOD-MONITORAMENTO-07 |
| **Justificativa** | Sem tabela de fotografia para manter |

---

#### RN-NOVO-MON-005: Efeito incremental

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-MONITORAMENTO |
| **Origem** | F-099 — ETF §2.1 e §6, detalhamento da regra de cálculo |
| **Domínio** | Monitoramento e KPIs |
| **Tipo** | Derivação |
| **Enunciado** | SE o ciclo tem carteira confirmada ENTÃO o efeito incremental é a taxa de regularização da carteira cobrada menos a do grupo de controle, em pontos percentuais |
| **Algoritmo** | 1. Contar os itens notificados fora do controle e, deles, os regularizados. 2. Taxa cobrada = regularizados ÷ notificados. 3. Contar os itens do grupo de controle e, deles, os regularizados. 4. Taxa do controle = regularizados ÷ itens de controle. 5. Efeito incremental = (taxa cobrada − taxa do controle) × 100, em pontos percentuais. |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-MONITORAMENTO-04 |
| **Justificativa** | Métrica principal do produto |

---


### Domínio: Governança, Acesso e Auditoria

#### RN-NOVO-GOV-001: Acesso na camada de dados

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-GOVERNANCA |
| **Origem** | F-114 — regra RN-028 do Explore (`especificacao-funcional.md §3 MOD-GOVERNANCA RN-028`) |
| **Domínio** | Governança, Acesso e Auditoria |
| **Tipo** | Restrição |
| **Enunciado** | SE um usuário consulta qualquer dado ENTÃO a permissão do papel dele é avaliada no próprio dado, não só no menu |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-GOVERNANCA-01, RF-MOD-GOVERNANCA-02, RF-MOD-INGESTAO-13 |
| **Justificativa** | Esconder menu não protege o dado |

---

#### RN-NOVO-GOV-002: CPF mascarado e exportação registrada

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-GOVERNANCA |
| **Origem** | F-115 — regra RN-029 do Explore (`especificacao-funcional.md §3 MOD-GOVERNANCA RN-029`) |
| **Domínio** | Governança, Acesso e Auditoria |
| **Tipo** | Restrição |
| **Enunciado** | SE o contribuinte é pessoa física ENTÃO o CPF aparece mascarado por padrão; SE alguém exporta dados ENTÃO só papéis autorizados conseguem e a exportação fica registrada |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-GOVERNANCA-03, RF-MOD-MONITORAMENTO-08, RF-MOD-QUALIFICADA-04 |
| **Justificativa** | LGPD |

---

#### RN-NOVO-GOV-003: Auditoria imutável

| Campo | Conteúdo |
|-------|----------|
| **Módulo** | MOD-GOVERNANCA |
| **Origem** | F-116 — regra RN-030 do Explore (`especificacao-funcional.md §3 MOD-GOVERNANCA RN-030`) |
| **Domínio** | Governança, Acesso e Auditoria |
| **Tipo** | Restrição |
| **Enunciado** | SE um evento de auditoria é gravado ENTÃO nenhum papel pode alterá-lo nem excluí-lo |
| **Algoritmo** | — (não é Derivação) |
| **Exceções** | — |
| **Conflitos** | — |
| **Vinculada a** | RF-MOD-GOVERNANCA-04, RF-MOD-GOVERNANCA-06 |
| **Justificativa** | Confiabilidade da trilha de auditoria |

---


<!-- id: br-conflicts -->

## Tabela de conflitos cruzados

| RN A | RN B | Tema do conflito | Resolução |
|------|------|------------------|-----------|
| RN-NOVO-QUA-002 | RN-NOVO-QUA-004 | Contribuinte que atende aos critérios dos dois segmentos | QA-01 |
| RN-NOVO-MON-003 | RN-NOVO-REG-002 | Contato por mais de um canal na janela de atribuição: qual canal recebe o crédito | QA-02 (provisório: o contato mais recente) |
| RN-NOVO-QUA-004 | RN-NOVO-ING-008 | Exclusão de contumazes depende de dado que a TI diz estar no Credep, fora das seis fontes | QA-03 |

---

<!-- id: br-open-questions -->

## Questões em aberto

| QA | RNs envolvidas | Descrição | Sugestão de tratamento |
|----|-----------------|------------|-------------------------|
| QA-01 | RN-NOVO-QUA-002, RN-NOVO-QUA-004 | Regra de desempate entre massificada e qualificada (gaps.md GAP-007) | Coordenação decide; provisório: vale o segmento qualificado quando o valor passa do limite da qualificada |
| QA-02 | RN-NOVO-MON-003 | Modelo de atribuição com mais de um canal na janela (GAP-008) | Validar com a Coordenação; provisório: contato mais recente |
| QA-03 | RN-NOVO-QUA-004 | Fonte da lista de contumazes: CCF ou Credep (GAP-017) | TI confirma; até lá a exclusão de contumazes usa o indicador recebido da CCF |
