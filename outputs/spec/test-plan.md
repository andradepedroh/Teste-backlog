# Plano de Testes — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

**Versão:** 1.0 | **Data:** 2026-11-13 | **Gerado por:** spec-test-plan v1.0

> ⚠️ ATENÇÃO: 2 avisos — revisar antes de usar em homologação: 7 épicas acima do tamanho recomendado (sugestão de divisão na seção «Tamanho das épicas»); 44 funcionalidades sem caso próprio de validação, regra ou situação-limite — justificativa por funcionalidade na seção «Matriz de cenários por funcionalidade».

> **Como usar este documento:**
> Execute cada caso de teste na ordem indicada dentro de cada épica.
> Marque o resultado como ✅ Aprovado, ❌ Reprovado ou ⏭️ Pulado (com justificativa).
> Em caso de reprovação, capture evidências (print de tela) e abra um chamado.

---

## Metadados

| Campo | Valor |
|-------|-------|
| Projeto | Cobrança Inteligente — 2.6 Cobrança (SEFAZ-MT), aplicação na plataforma ServiceNow |
| Épicas cobertas | EPIC-001, EPIC-002, EPIC-003, EPIC-004, EPIC-005, EPIC-006, EPIC-007 — todos os 7 módulos (simulação; decisor Pedro) |
| Total de casos de teste | 281 |
| Responsável pelos testes | A preencher |
| Ambiente alvo | Homologação |
| Ambiente de integrações (sandbox/mock) | Simulador: as seis fontes e a UFMT entram pelo simulador de cargas da própria aplicação (lotes válidos, inválidos e repetidos — RF-MOD-INGESTAO-15); o provedor de e-mail, SMS e WhatsApp é um simulador até a contratação (GAP-004). Nenhum sistema parceiro real é usado |
| Perfis de usuário cobertos | Gestor de Integração, Coordenador de Cobrança, Atendente (dois usuários, para testar o isolamento), Auditor, Administrador — os 5 papéis da aplicação |
| Data de execução | A preencher |
| Versão testada | A preencher |

---

## Glossário

| Termo | Significado |
|-------|-------------|
| Fonte | Sistema da SEFAZ que envia débitos ou score: CCF (Conta Corrente Fiscal), MPI, Big Data, IPVA, ITCD, SNE/DT-e e UFMT. |
| Lote | Remessa diária de uma fonte, enviada em pacotes numerados. |
| Carteira | Lista de contribuintes escolhidos para cobrança no ciclo. |
| Grupo de controle | Parte da carteira sorteada que não é cobrada, para medir o efeito da cobrança. |
| Régua | Sequência de mensagens (e-mail, SMS, WhatsApp) enviadas em etapas. |
| Caso | Contribuinte encaminhado a um atendente para cobrança qualificada. |
| Opt-in | Autorização do contribuinte para receber mensagem por um canal. |
| Simulador de cargas | Função da aplicação, só fora de produção, que gera lotes de teste das fontes. |
| RF / RN | Requisito funcional / regra de negócio — o código no fim de cada caso aponta o requisito ou a regra testada. |

---

## Sumário de Execução

| ID | Título | Categoria | Épica | Status |
|----|--------|-----------|-------|--------|
| TC-001 | Receber débitos das fontes: lote completo aceito | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-002 | Receber débitos das fontes: lote com parte rejeitada | VALIDAÇÃO | EPIC-001 | ⬜ Pendente |
| TC-003 | Receber débitos das fontes: fonte enviando por outra API | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-004 | Cumprir a regra «Só a carga grava dados de origem» | REGRA | EPIC-001 | ⬜ Pendente |
| TC-005 | Validar o documento do contribuinte: documento válido com máscara | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-006 | Validar o documento do contribuinte: cPF válido de pessoa física | INTEGRAÇÃO | EPIC-001 | ⬜ Pendente |
| TC-007 | Validar o documento do contribuinte: dígito inválido | VALIDAÇÃO | EPIC-001 | ⬜ Pendente |
| TC-008 | Cumprir a regra «Rejeição de documento inválido» | REGRA | EPIC-001 | ⬜ Pendente |
| TC-009 | Validar o documento do contribuinte: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-010 | Consolidar débitos por contribuinte: contribuinte em duas fontes | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-011 | Consolidar débitos por contribuinte: contribuinte novo | REGRA | EPIC-001 | ⬜ Pendente |
| TC-012 | Consolidar débitos por contribuinte: mesmo débito pelo MPI e pelo Big Data | BORDA | EPIC-001 | ⬜ Pendente |
| TC-013 | Juntar débitos de duas fontes no mesmo contribuinte e somar a posição do tributo | REGRA | EPIC-001 | ⬜ Pendente |
| TC-014 | Consolidar débitos por contribuinte: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-015 | Evitar duplicidade no reenvio: pacote reenviado | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-016 | Evitar duplicidade no reenvio: registro atualizado | BORDA | EPIC-001 | ⬜ Pendente |
| TC-017 | Evitar duplicidade no reenvio: pacote fora de sequência | BORDA | EPIC-001 | ⬜ Pendente |
| TC-018 | Cumprir a regra «Reenvio não duplica» | REGRA | EPIC-001 | ⬜ Pendente |
| TC-019 | Evitar duplicidade no reenvio: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-020 | Fechar o ciclo diário e acompanhar as fontes: todas entregaram | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-021 | Fechar o ciclo diário e acompanhar as fontes: lote parcial | REGRA | EPIC-001 | ⬜ Pendente |
| TC-022 | Fechar o ciclo diário e acompanhar as fontes: fonte não entregou | BORDA | EPIC-001 | ⬜ Pendente |
| TC-023 | Fechar o ciclo diário e acompanhar as fontes: campo Data do lote inválido | VALIDAÇÃO | EPIC-001 | ⬜ Pendente |
| TC-024 | Cumprir a regra «Falha de uma fonte não para as outras» | REGRA | EPIC-001 | ⬜ Pendente |
| TC-025 | Fechar o ciclo diário e acompanhar as fontes: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-026 | Seguir operando com fonte em falha: uma fonte falha | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-027 | Seguir operando com fonte em falha: fonte volta no dia seguinte | REGRA | EPIC-001 | ⬜ Pendente |
| TC-028 | Seguir operando com fonte em falha: nenhuma carga válida | BORDA | EPIC-001 | ⬜ Pendente |
| TC-029 | Seguir operando com fonte em falha: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-030 | Carga inicial e reconciliação: carga inicial conferida | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-031 | Carga inicial e reconciliação: carga inicial em 3 lotes | REGRA | EPIC-001 | ⬜ Pendente |
| TC-032 | Carga inicial e reconciliação: total divergente | REGRA | EPIC-001 | ⬜ Pendente |
| TC-033 | Carga inicial e reconciliação: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-034 | Reprocessar registros rejeitados: reprocesso aceito | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-035 | Reprocessar registros rejeitados: reprocesso em lote | BORDA | EPIC-001 | ⬜ Pendente |
| TC-036 | Reprocessar registros rejeitados: reprocesso falha de novo | VALIDAÇÃO | EPIC-001 | ⬜ Pendente |
| TC-037 | Reprocessar registros rejeitados: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-038 | Atualizar a regularização durante o ciclo: regularização total | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-039 | Atualizar a regularização durante o ciclo: regularização parcial | REGRA | EPIC-001 | ⬜ Pendente |
| TC-040 | Atualizar a regularização durante o ciclo: comunicação já agendada | REGRA | EPIC-001 | ⬜ Pendente |
| TC-041 | Atualizar a regularização durante o ciclo: campo Situação da cobrança inválido | VALIDAÇÃO | EPIC-001 | ⬜ Pendente |
| TC-042 | Cumprir a regra «Regularização encerra a abordagem no ciclo» | REGRA | EPIC-001 | ⬜ Pendente |
| TC-043 | Atualizar a regularização durante o ciclo: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-044 | Alertar parcelamento em risco: parcela vencida | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-045 | Alertar parcelamento em risco: parcela quitada | ESTADO | EPIC-001 | ⬜ Pendente |
| TC-046 | Alertar parcelamento em risco: parcelamento encerrado | ESTADO | EPIC-001 | ⬜ Pendente |
| TC-047 | Alertar parcelamento em risco: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-048 | Transição MPI → Big Data: débito só no MPI | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-049 | Transição MPI → Big Data: percentual de migração | REGRA | EPIC-001 | ⬜ Pendente |
| TC-050 | Transição MPI → Big Data: débito nas duas fontes | BORDA | EPIC-001 | ⬜ Pendente |
| TC-051 | Cumprir a regra «Continuidade na transição MPI → Big Data» | REGRA | EPIC-001 | ⬜ Pendente |
| TC-052 | Transição MPI → Big Data: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-053 | Receber sinalização coercitiva: sinalização ativa | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-054 | Receber sinalização coercitiva: sinalização encerrada | ESTADO | EPIC-001 | ⬜ Pendente |
| TC-055 | Receber sinalização coercitiva: tentativa de ação | REGRA | EPIC-001 | ⬜ Pendente |
| TC-056 | Cumprir a regra «Sinalização coercitiva é só informativa» | REGRA | EPIC-001 | ⬜ Pendente |
| TC-057 | Receber sinalização coercitiva: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-058 | Visão única do contribuinte: contribuinte com histórico | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-059 | Visão única do contribuinte: contribuinte sem comunicação | BORDA | EPIC-001 | ⬜ Pendente |
| TC-060 | Visão única do contribuinte: atendente sem o caso | REGRA | EPIC-001 | ⬜ Pendente |
| TC-061 | Visão única do contribuinte: campo Tipo de pessoa inválido | VALIDAÇÃO | EPIC-001 | ⬜ Pendente |
| TC-062 | Cumprir a regra «Acesso na camada de dados» | REGRA | EPIC-001 | ⬜ Pendente |
| TC-063 | Visão única do contribuinte: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-064 | Carteira consolidada: filtro por tributo | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-065 | Carteira consolidada: filtro salvo | REGRA | EPIC-001 | ⬜ Pendente |
| TC-066 | Carteira consolidada: filtro sem resultado | BORDA | EPIC-001 | ⬜ Pendente |
| TC-067 | Carteira consolidada: campo Atraso mínimo (dias) inválido | VALIDAÇÃO | EPIC-001 | ⬜ Pendente |
| TC-068 | Carteira consolidada: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-069 | Simular cargas das fontes: lote simulado válido | PRINCIPAL | EPIC-001 | ⬜ Pendente |
| TC-070 | Simular cargas das fontes: lote com inválidos | VALIDAÇÃO | EPIC-001 | ⬜ Pendente |
| TC-071 | Simular cargas das fontes: ambiente de produção | REGRA | EPIC-001 | ⬜ Pendente |
| TC-072 | Simular cargas das fontes: perfil sem permissão não consegue | ACESSO | EPIC-001 | ⬜ Pendente |
| TC-073 | Estados da tela Integrações & Sincronização | ESTADO | EPIC-001 | ⬜ Pendente |
| TC-074 | Estados da tela Carteira Consolidada | ESTADO | EPIC-001 | ⬜ Pendente |
| TC-075 | Estados da tela Visão Única do Contribuinte | ESTADO | EPIC-001 | ⬜ Pendente |
| TC-076 | Parametrizar critérios da carteira: rascunho completo | PRINCIPAL | EPIC-002 | ⬜ Pendente |
| TC-077 | Parametrizar critérios da carteira: sem limite de score | BORDA | EPIC-002 | ⬜ Pendente |
| TC-078 | Parametrizar critérios da carteira: valor negativo | BORDA | EPIC-002 | ⬜ Pendente |
| TC-079 | Parametrizar critérios da carteira: campo Tributos inválido | VALIDAÇÃO | EPIC-002 | ⬜ Pendente |
| TC-080 | Cumprir a regra «Critérios configuráveis e versionados» | REGRA | EPIC-002 | ⬜ Pendente |
| TC-081 | Entrar na carteira só quem atende a todos os critérios da versão | REGRA | EPIC-002 | ⬜ Pendente |
| TC-082 | Parametrizar critérios da carteira: perfil sem permissão não consegue | ACESSO | EPIC-002 | ⬜ Pendente |
| TC-083 | Versionar critérios: publicação | PRINCIPAL | EPIC-002 | ⬜ Pendente |
| TC-084 | Versionar critérios: nova versão a partir da publicada | ESTADO | EPIC-002 | ⬜ Pendente |
| TC-085 | Versionar critérios: sem fundamentação | ESTADO | EPIC-002 | ⬜ Pendente |
| TC-086 | Versionar critérios: campo Fundamentação inválido | VALIDAÇÃO | EPIC-002 | ⬜ Pendente |
| TC-087 | Versionar critérios: limites do campo Fundamentação | BORDA | EPIC-002 | ⬜ Pendente |
| TC-088 | Cumprir a regra «Versão publicada e carteira confirmada são imutáveis» | REGRA | EPIC-002 | ⬜ Pendente |
| TC-089 | Cumprir a regra «Prévia vigente para publicar» | REGRA | EPIC-002 | ⬜ Pendente |
| TC-090 | Versionar critérios: perfil sem permissão não consegue | ACESSO | EPIC-002 | ⬜ Pendente |
| TC-091 | Simular a carteira: prévia gerada | PRINCIPAL | EPIC-002 | ⬜ Pendente |
| TC-092 | Simular a carteira: prévia refeita | ESTADO | EPIC-002 | ⬜ Pendente |
| TC-093 | Simular a carteira: prévia vazia | BORDA | EPIC-002 | ⬜ Pendente |
| TC-094 | Simular a carteira: perfil sem permissão não consegue | ACESSO | EPIC-002 | ⬜ Pendente |
| TC-095 | Segmentar massificada × qualificada: segmentação | PRINCIPAL | EPIC-002 | ⬜ Pendente |
| TC-096 | Segmentar massificada × qualificada: sem qualificada | REGRA | EPIC-002 | ⬜ Pendente |
| TC-097 | Segmentar massificada × qualificada: contribuinte nos dois critérios | BORDA | EPIC-002 | ⬜ Pendente |
| TC-098 | Cumprir a regra «Um eixo por contribuinte no ciclo» | REGRA | EPIC-002 | ⬜ Pendente |
| TC-099 | Segmentar massificada × qualificada: perfil sem permissão não consegue | ACESSO | EPIC-002 | ⬜ Pendente |
| TC-100 | Sortear o grupo de controle: sorteio padrão | PRINCIPAL | EPIC-002 | ⬜ Pendente |
| TC-101 | Sortear o grupo de controle: sorteio refeito | BORDA | EPIC-002 | ⬜ Pendente |
| TC-102 | Sortear o grupo de controle: controle não é cobrado | ESTADO | EPIC-002 | ⬜ Pendente |
| TC-103 | Sortear 3% da carteira como grupo de controle, arredondando para cima | REGRA | EPIC-002 | ⬜ Pendente |
| TC-104 | Sortear o grupo de controle: perfil sem permissão não consegue | ACESSO | EPIC-002 | ⬜ Pendente |
| TC-105 | Confirmar a carteira: confirmação | PRINCIPAL | EPIC-002 | ⬜ Pendente |
| TC-106 | Confirmar a carteira: carteira já confirmada | ESTADO | EPIC-002 | ⬜ Pendente |
| TC-107 | Confirmar a carteira: versão em rascunho | ESTADO | EPIC-002 | ⬜ Pendente |
| TC-108 | Confirmar a carteira: perfil sem permissão não consegue | ACESSO | EPIC-002 | ⬜ Pendente |
| TC-109 | Estados da tela Critérios de Qualificação | ESTADO | EPIC-002 | ⬜ Pendente |
| TC-110 | Estados da tela Prévia da Carteira Segmentada | ESTADO | EPIC-002 | ⬜ Pendente |
| TC-111 | Receber o score da UFMT: lote de score | PRINCIPAL | EPIC-003 | ⬜ Pendente |
| TC-112 | Receber o score da UFMT: contribuinte inexistente | INTEGRAÇÃO | EPIC-003 | ⬜ Pendente |
| TC-113 | Receber o score da UFMT: lote sem versão do modelo | VALIDAÇÃO | EPIC-003 | ⬜ Pendente |
| TC-114 | Cumprir a regra «Fallback sem score» | REGRA | EPIC-003 | ⬜ Pendente |
| TC-115 | Receber o score da UFMT: perfil sem permissão não consegue | ACESSO | EPIC-003 | ⬜ Pendente |
| TC-116 | Classificar o score em faixas: score na faixa | PRINCIPAL | EPIC-003 | ⬜ Pendente |
| TC-117 | Classificar o score em faixas: faixas alteradas | BORDA | EPIC-003 | ⬜ Pendente |
| TC-118 | Classificar o score em faixas: valor fora das faixas | REGRA | EPIC-003 | ⬜ Pendente |
| TC-119 | Classificar o score em faixas: campo Limites da faixa inválido | VALIDAÇÃO | EPIC-003 | ⬜ Pendente |
| TC-120 | Classificar o score na faixa certa, com o limite inferior incluído | REGRA | EPIC-003 | ⬜ Pendente |
| TC-121 | Classificar o score em faixas: perfil sem permissão não consegue | ACESSO | EPIC-003 | ⬜ Pendente |
| TC-122 | Operar sem score: sem score | PRINCIPAL | EPIC-003 | ⬜ Pendente |
| TC-123 | Operar sem score: score chega depois | BORDA | EPIC-003 | ⬜ Pendente |
| TC-124 | Operar sem score: modelo indisponível | REGRA | EPIC-003 | ⬜ Pendente |
| TC-125 | Operar sem score: perfil sem permissão não consegue | ACESSO | EPIC-003 | ⬜ Pendente |
| TC-126 | Painel do Score: painel completo | PRINCIPAL | EPIC-003 | ⬜ Pendente |
| TC-127 | Painel do Score: filtro por tributo | REGRA | EPIC-003 | ⬜ Pendente |
| TC-128 | Painel do Score: atendente | REGRA | EPIC-003 | ⬜ Pendente |
| TC-129 | Cumprir a regra «Visibilidade por perfil» | REGRA | EPIC-003 | ⬜ Pendente |
| TC-130 | Painel do Score: perfil sem permissão não consegue | ACESSO | EPIC-003 | ⬜ Pendente |
| TC-131 | Estados da tela Painel do Score de Liquidez | ESTADO | EPIC-003 | ⬜ Pendente |
| TC-132 | Montar a régua: régua nova | PRINCIPAL | EPIC-004 | ⬜ Pendente |
| TC-133 | Montar a régua: régua a partir de outra | REGRA | EPIC-004 | ⬜ Pendente |
| TC-134 | Montar a régua: etapa duplicada | BORDA | EPIC-004 | ⬜ Pendente |
| TC-135 | Montar a régua: campo Nome da régua inválido | VALIDAÇÃO | EPIC-004 | ⬜ Pendente |
| TC-136 | Cumprir a regra «Régua consistente» | REGRA | EPIC-004 | ⬜ Pendente |
| TC-137 | Montar a régua: perfil sem permissão não consegue | ACESSO | EPIC-004 | ⬜ Pendente |
| TC-138 | Enviar a etapa devida: etapa do dia | PRINCIPAL | EPIC-004 | ⬜ Pendente |
| TC-139 | Enviar a etapa devida: sem etapa no dia | REGRA | EPIC-004 | ⬜ Pendente |
| TC-140 | Enviar a etapa devida: contribuinte regularizou | BORDA | EPIC-004 | ⬜ Pendente |
| TC-141 | Cumprir a regra «Escalonamento da régua» | REGRA | EPIC-004 | ⬜ Pendente |
| TC-142 | Enviar a etapa devida: perfil sem permissão não consegue | ACESSO | EPIC-004 | ⬜ Pendente |
| TC-143 | Escalonar e encaminhar: régua esgotada | PRINCIPAL | EPIC-004 | ⬜ Pendente |
| TC-144 | Escalonar e encaminhar: regularizou no meio | ESTADO | EPIC-004 | ⬜ Pendente |
| TC-145 | Escalonar e encaminhar: régua pausada | ESTADO | EPIC-004 | ⬜ Pendente |
| TC-146 | Escalonar e encaminhar: perfil sem permissão não consegue | ACESSO | EPIC-004 | ⬜ Pendente |
| TC-147 | Respeitar o consentimento: com opt-in | PRINCIPAL | EPIC-004 | ⬜ Pendente |
| TC-148 | Respeitar o consentimento: opt-out no dia | REGRA | EPIC-004 | ⬜ Pendente |
| TC-149 | Respeitar o consentimento: sem opt-in | BORDA | EPIC-004 | ⬜ Pendente |
| TC-150 | Cumprir a regra «Consentimento por canal» | REGRA | EPIC-004 | ⬜ Pendente |
| TC-151 | Respeitar o consentimento: perfil sem permissão não consegue | ACESSO | EPIC-004 | ⬜ Pendente |
| TC-152 | Enviar por canal: envio por e-mail | PRINCIPAL | EPIC-004 | ⬜ Pendente |
| TC-153 | Enviar por canal: troca de provedor | REGRA | EPIC-004 | ⬜ Pendente |
| TC-154 | Enviar por canal: variável ausente | VALIDAÇÃO | EPIC-004 | ⬜ Pendente |
| TC-155 | Enviar por canal: perfil sem permissão não consegue | ACESSO | EPIC-004 | ⬜ Pendente |
| TC-156 | Receber o status de entrega: entregue | PRINCIPAL | EPIC-004 | ⬜ Pendente |
| TC-157 | Receber o status de entrega: status repetido | BORDA | EPIC-004 | ⬜ Pendente |
| TC-158 | Receber o status de entrega: status de comunicação inexistente | INTEGRAÇÃO | EPIC-004 | ⬜ Pendente |
| TC-159 | Receber o status de entrega: perfil sem permissão não consegue | ACESSO | EPIC-004 | ⬜ Pendente |
| TC-160 | Reenviar falhas: reenvio com sucesso | PRINCIPAL | EPIC-004 | ⬜ Pendente |
| TC-161 | Reenviar falhas: limite alterado | BORDA | EPIC-004 | ⬜ Pendente |
| TC-162 | Reenviar falhas: limite atingido | BORDA | EPIC-004 | ⬜ Pendente |
| TC-163 | Cumprir a regra «Reenvio limitado» | REGRA | EPIC-004 | ⬜ Pendente |
| TC-164 | Reenviar falhas: perfil sem permissão não consegue | ACESSO | EPIC-004 | ⬜ Pendente |
| TC-165 | Pausar e retomar a régua: pausa | PRINCIPAL | EPIC-004 | ⬜ Pendente |
| TC-166 | Pausar e retomar a régua: retomada | ESTADO | EPIC-004 | ⬜ Pendente |
| TC-167 | Pausar e retomar a régua: pausa com envios no dia | ESTADO | EPIC-004 | ⬜ Pendente |
| TC-168 | Pausar e retomar a régua: campo Estado inválido | VALIDAÇÃO | EPIC-004 | ⬜ Pendente |
| TC-169 | Cumprir a regra «Pausa não cancela o enviado» | REGRA | EPIC-004 | ⬜ Pendente |
| TC-170 | Pausar e retomar a régua: perfil sem permissão não consegue | ACESSO | EPIC-004 | ⬜ Pendente |
| TC-171 | Acompanhar a execução: lista do dia | PRINCIPAL | EPIC-004 | ⬜ Pendente |
| TC-172 | Acompanhar a execução: filtro por falha | REGRA | EPIC-004 | ⬜ Pendente |
| TC-173 | Acompanhar a execução: sem comunicações | BORDA | EPIC-004 | ⬜ Pendente |
| TC-174 | Acompanhar a execução: campo Data de envio inválido | VALIDAÇÃO | EPIC-004 | ⬜ Pendente |
| TC-175 | Acompanhar a execução: perfil sem permissão não consegue | ACESSO | EPIC-004 | ⬜ Pendente |
| TC-176 | Estados da tela Editor de Régua | ESTADO | EPIC-004 | ⬜ Pendente |
| TC-177 | Estados da tela Execução & Status de Disparo | ESTADO | EPIC-004 | ⬜ Pendente |
| TC-178 | Criar casos: carteira confirmada | PRINCIPAL | EPIC-005 | ⬜ Pendente |
| TC-179 | Criar casos: régua esgotada | REGRA | EPIC-005 | ⬜ Pendente |
| TC-180 | Criar casos: caso já aberto | BORDA | EPIC-005 | ⬜ Pendente |
| TC-181 | Criar casos: perfil sem permissão não consegue | ACESSO | EPIC-005 | ⬜ Pendente |
| TC-182 | Distribuir casos: distribuição por carga | PRINCIPAL | EPIC-005 | ⬜ Pendente |
| TC-183 | Distribuir casos: distribuição por grupo | REGRA | EPIC-005 | ⬜ Pendente |
| TC-184 | Distribuir casos: grupo sem atendente ativo | REGRA | EPIC-005 | ⬜ Pendente |
| TC-185 | Atribuir o caso novo ao atendente com menos casos; no empate, ao que recebeu há mais tempo | REGRA | EPIC-005 | ⬜ Pendente |
| TC-186 | Distribuir casos: perfil sem permissão não consegue | ACESSO | EPIC-005 | ⬜ Pendente |
| TC-187 | Fila priorizada: minha fila | PRINCIPAL | EPIC-005 | ⬜ Pendente |
| TC-188 | Fila priorizada: caso sem score | BORDA | EPIC-005 | ⬜ Pendente |
| TC-189 | Fila priorizada: caso de outro atendente | ACESSO | EPIC-005 | ⬜ Pendente |
| TC-190 | Ordenar a fila do atendente pela prioridade calculada com score, valor e atraso | REGRA | EPIC-005 | ⬜ Pendente |
| TC-191 | Dossiê do caso: dossiê completo | PRINCIPAL | EPIC-005 | ⬜ Pendente |
| TC-192 | Dossiê do caso: grupo econômico | REGRA | EPIC-005 | ⬜ Pendente |
| TC-193 | Dossiê do caso: cPF de pessoa física | REGRA | EPIC-005 | ⬜ Pendente |
| TC-194 | Cumprir a regra «CPF mascarado e exportação registrada» | REGRA | EPIC-005 | ⬜ Pendente |
| TC-195 | Dossiê do caso: perfil sem permissão não consegue | ACESSO | EPIC-005 | ⬜ Pendente |
| TC-196 | Registrar interação: interação registrada | PRINCIPAL | EPIC-005 | ⬜ Pendente |
| TC-197 | Registrar interação: correção de interação | REGRA | EPIC-005 | ⬜ Pendente |
| TC-198 | Registrar interação: tentativa de editar | REGRA | EPIC-005 | ⬜ Pendente |
| TC-199 | Registrar interação: campo Tipo de contato inválido | VALIDAÇÃO | EPIC-005 | ⬜ Pendente |
| TC-200 | Registrar interação: limites do campo Descrição | BORDA | EPIC-005 | ⬜ Pendente |
| TC-201 | Cumprir a regra «Ações auditáveis e imutáveis» | REGRA | EPIC-005 | ⬜ Pendente |
| TC-202 | Registrar interação: perfil sem permissão não consegue | ACESSO | EPIC-005 | ⬜ Pendente |
| TC-203 | Follow-up com lembrete: lembrete no dia | PRINCIPAL | EPIC-005 | ⬜ Pendente |
| TC-204 | Follow-up com lembrete: follow-up reagendado | ESTADO | EPIC-005 | ⬜ Pendente |
| TC-205 | Follow-up com lembrete: data no passado | ESTADO | EPIC-005 | ⬜ Pendente |
| TC-206 | Follow-up com lembrete: campo Data do follow-up inválido | VALIDAÇÃO | EPIC-005 | ⬜ Pendente |
| TC-207 | Follow-up com lembrete: perfil sem permissão não consegue | ACESSO | EPIC-005 | ⬜ Pendente |
| TC-208 | Reatribuir casos: reatribuição | PRINCIPAL | EPIC-005 | ⬜ Pendente |
| TC-209 | Reatribuir casos: reatribuição em lote | ESTADO | EPIC-005 | ⬜ Pendente |
| TC-210 | Reatribuir casos: atendente comum tenta reatribuir | REGRA | EPIC-005 | ⬜ Pendente |
| TC-211 | Reatribuir casos: campo Atendente inválido | VALIDAÇÃO | EPIC-005 | ⬜ Pendente |
| TC-212 | Reatribuir casos: perfil sem permissão não consegue | ACESSO | EPIC-005 | ⬜ Pendente |
| TC-213 | Estados da tela Minha Fila | ESTADO | EPIC-005 | ⬜ Pendente |
| TC-214 | Estados da tela Dossiê & Caso | ESTADO | EPIC-005 | ⬜ Pendente |
| TC-215 | Marcar notificado e regularizado: notificado por comunicação | PRINCIPAL | EPIC-006 | ⬜ Pendente |
| TC-216 | Marcar notificado e regularizado: notificado por interação | REGRA | EPIC-006 | ⬜ Pendente |
| TC-217 | Marcar notificado e regularizado: item do grupo de controle | REGRA | EPIC-006 | ⬜ Pendente |
| TC-218 | Cumprir a regra «Indicadores direto das tabelas» | REGRA | EPIC-006 | ⬜ Pendente |
| TC-219 | Marcar notificado e regularizado: perfil sem permissão não consegue | ACESSO | EPIC-006 | ⬜ Pendente |
| TC-220 | Atribuir a origem da regularização: resposta à cobrança | PRINCIPAL | EPIC-006 | ⬜ Pendente |
| TC-221 | Atribuir a origem da regularização: espontânea | BORDA | EPIC-006 | ⬜ Pendente |
| TC-222 | Atribuir a origem da regularização: grupo de controle | ESTADO | EPIC-006 | ⬜ Pendente |
| TC-223 | Cumprir a regra «Origem da regularização» | REGRA | EPIC-006 | ⬜ Pendente |
| TC-224 | Calcular a origem da regularização pela janela de 30 dias | REGRA | EPIC-006 | ⬜ Pendente |
| TC-225 | Atribuir a origem da regularização: perfil sem permissão não consegue | ACESSO | EPIC-006 | ⬜ Pendente |
| TC-226 | Indicadores de funil: funil do ciclo | PRINCIPAL | EPIC-006 | ⬜ Pendente |
| TC-227 | Indicadores de funil: recorte por tributo | REGRA | EPIC-006 | ⬜ Pendente |
| TC-228 | Indicadores de funil: ciclo sem carteira | ESTADO | EPIC-006 | ⬜ Pendente |
| TC-229 | Indicadores de funil: perfil sem permissão não consegue | ACESSO | EPIC-006 | ⬜ Pendente |
| TC-230 | Efeito incremental: efeito positivo | PRINCIPAL | EPIC-006 | ⬜ Pendente |
| TC-231 | Efeito incremental: por tributo | REGRA | EPIC-006 | ⬜ Pendente |
| TC-232 | Efeito incremental: controle vazio | BORDA | EPIC-006 | ⬜ Pendente |
| TC-233 | Calcular o efeito incremental contra o grupo de controle | REGRA | EPIC-006 | ⬜ Pendente |
| TC-234 | Efeito incremental: perfil sem permissão não consegue | ACESSO | EPIC-006 | ⬜ Pendente |
| TC-235 | Retorno das réguas: retorno por canal | PRINCIPAL | EPIC-006 | ⬜ Pendente |
| TC-236 | Retorno das réguas: janela em aberto | REGRA | EPIC-006 | ⬜ Pendente |
| TC-237 | Retorno das réguas: sem envio | ESTADO | EPIC-006 | ⬜ Pendente |
| TC-238 | Retorno das réguas: perfil sem permissão não consegue | ACESSO | EPIC-006 | ⬜ Pendente |
| TC-239 | Realizado × meta: meta não atingida | PRINCIPAL | EPIC-006 | ⬜ Pendente |
| TC-240 | Realizado × meta: meta atingida | REGRA | EPIC-006 | ⬜ Pendente |
| TC-241 | Realizado × meta: sem meta cadastrada | ESTADO | EPIC-006 | ⬜ Pendente |
| TC-242 | Realizado × meta: perfil sem permissão não consegue | ACESSO | EPIC-006 | ⬜ Pendente |
| TC-243 | Painel Institucional: painel completo | PRINCIPAL | EPIC-006 | ⬜ Pendente |
| TC-244 | Painel Institucional: filtro de ciclo | REGRA | EPIC-006 | ⬜ Pendente |
| TC-245 | Painel Institucional: atendente | REGRA | EPIC-006 | ⬜ Pendente |
| TC-246 | Painel Institucional: perfil sem permissão não consegue | ACESSO | EPIC-006 | ⬜ Pendente |
| TC-247 | Regularizações por origem: lista filtrada | PRINCIPAL | EPIC-006 | ⬜ Pendente |
| TC-248 | Regularizações por origem: exportação | REGRA | EPIC-006 | ⬜ Pendente |
| TC-249 | Regularizações por origem: sem regularização | BORDA | EPIC-006 | ⬜ Pendente |
| TC-250 | Regularizações por origem: campo Período inválido | VALIDAÇÃO | EPIC-006 | ⬜ Pendente |
| TC-251 | Regularizações por origem: perfil sem permissão não consegue | ACESSO | EPIC-006 | ⬜ Pendente |
| TC-252 | Estados da tela Regularizações & Origem | ESTADO | EPIC-006 | ⬜ Pendente |
| TC-253 | Estados da tela Painel Institucional de Cobrança | ESTADO | EPIC-006 | ⬜ Pendente |
| TC-254 | Controlar acesso por papel: coordenador | PRINCIPAL | EPIC-007 | ⬜ Pendente |
| TC-255 | Controlar acesso por papel: auditor | REGRA | EPIC-007 | ⬜ Pendente |
| TC-256 | Controlar acesso por papel: acesso direto pelo endereço | REGRA | EPIC-007 | ⬜ Pendente |
| TC-257 | Controlar acesso por papel: perfil sem permissão não consegue | ACESSO | EPIC-007 | ⬜ Pendente |
| TC-258 | Isolar a visão do atendente: contribuinte do meu caso | PRINCIPAL | EPIC-007 | ⬜ Pendente |
| TC-259 | Isolar a visão do atendente: caso reatribuído | BORDA | EPIC-007 | ⬜ Pendente |
| TC-260 | Isolar a visão do atendente: busca de outro contribuinte | ACESSO | EPIC-007 | ⬜ Pendente |
| TC-261 | Mascarar CPF e restringir exportação: cPF mascarado | PRINCIPAL | EPIC-007 | ⬜ Pendente |
| TC-262 | Mascarar CPF e restringir exportação: exportação autorizada | REGRA | EPIC-007 | ⬜ Pendente |
| TC-263 | Mascarar CPF e restringir exportação: exportação negada | REGRA | EPIC-007 | ⬜ Pendente |
| TC-264 | Mascarar CPF e restringir exportação: campo CPF/CNPJ inválido | VALIDAÇÃO | EPIC-007 | ⬜ Pendente |
| TC-265 | Mascarar CPF e restringir exportação: perfil sem permissão não consegue | ACESSO | EPIC-007 | ⬜ Pendente |
| TC-266 | Auditar ações e parâmetros: alteração de parâmetro | PRINCIPAL | EPIC-007 | ⬜ Pendente |
| TC-267 | Auditar ações e parâmetros: alteração de meta | REGRA | EPIC-007 | ⬜ Pendente |
| TC-268 | Auditar ações e parâmetros: tentativa de apagar evento | ACESSO | EPIC-007 | ⬜ Pendente |
| TC-269 | Cumprir a regra «Auditoria imutável» | REGRA | EPIC-007 | ⬜ Pendente |
| TC-270 | Administrar parâmetros, faixas e metas: parâmetro alterado | PRINCIPAL | EPIC-007 | ⬜ Pendente |
| TC-271 | Administrar parâmetros, faixas e metas: meta nova | ESTADO | EPIC-007 | ⬜ Pendente |
| TC-272 | Administrar parâmetros, faixas e metas: valor fora do limite | BORDA | EPIC-007 | ⬜ Pendente |
| TC-273 | Administrar parâmetros, faixas e metas: campo Valor inválido | VALIDAÇÃO | EPIC-007 | ⬜ Pendente |
| TC-274 | Administrar parâmetros, faixas e metas: perfil sem permissão não consegue | ACESSO | EPIC-007 | ⬜ Pendente |
| TC-275 | Consultar auditoria: consulta | PRINCIPAL | EPIC-007 | ⬜ Pendente |
| TC-276 | Consultar auditoria: versões | REGRA | EPIC-007 | ⬜ Pendente |
| TC-277 | Consultar auditoria: tentativa de editar | REGRA | EPIC-007 | ⬜ Pendente |
| TC-278 | Consultar auditoria: campo Período inválido | VALIDAÇÃO | EPIC-007 | ⬜ Pendente |
| TC-279 | Consultar auditoria: perfil sem permissão não consegue | ACESSO | EPIC-007 | ⬜ Pendente |
| TC-280 | Estados da tela Parâmetros, faixas de score e metas | ESTADO | EPIC-007 | ⬜ Pendente |
| TC-281 | Estados da tela Auditoria | ESTADO | EPIC-007 | ⬜ Pendente |

> Legenda: ⬜ Pendente · ✅ Aprovado · ❌ Reprovado · ⏭️ Pulado

---

## [EPIC-001] — Ingestão e Carteira Consolidada

> **Descrição da épica:** testes de homologação do módulo Ingestão e Carteira Consolidada (MOD-INGESTAO): 15 funcionalidades e 3 telas.

### Pré-requisitos da Épica

- Ambiente de homologação disponível, com a massa de dados do Anexo B carregada e sem dado pessoal real.
- Usuários de teste dos perfis do Anexo A criados.
- Simulador de cargas habilitado (só existe fora de produção); os sistemas parceiros reais não são usados.

---

### [TC-001] Receber débitos das fontes: lote completo aceito [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a CCF abriu um lote e enviou 3 pacotes válidos —, confirmar que, quando ela fecha o lote informando 3 pacotes, o lote fica OK e os débitos aparecem na posição dos contribuintes. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-01 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a CCF abriu um lote e enviou 3 pacotes válidos.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: a CCF abriu um lote e enviou 3 pacotes válidos.
4. Execute: ela fecha o lote informando 3 pacotes.
5. Volte à tela **Integrações & Sincronização** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O lote fica OK e os débitos aparecem na posição dos contribuintes.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-002] Receber débitos das fontes: lote com parte rejeitada [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um pacote tem 2 registros com campo obrigatório ausente —, confirmar que, quando a fonte fecha o lote, o lote fica Parcial e a resposta lista os 2 registros com o motivo. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-01, RN-NOVO-ING-008 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um pacote tem 2 registros com campo obrigatório ausente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um pacote tem 2 registros com campo obrigatório ausente.
4. Execute: a fonte fecha o lote.
5. Volte à tela **Integrações & Sincronização** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O lote fica Parcial e a resposta lista os 2 registros com o motivo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-003] Receber débitos das fontes: fonte enviando por outra API [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o usuário de integração do IPVA chama a API da CCF —, confirmar que, quando envia um pacote, o sistema recusa o envio e nada é gravado. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-01 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o usuário de integração do IPVA chama a API da CCF.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: o usuário de integração do IPVA chama a API da CCF.
4. Execute: envia um pacote.
5. Volte à tela **Integrações & Sincronização** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O sistema recusa o envio e nada é gravado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-004] Cumprir a regra «Só a carga grava dados de origem» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o dado é de contribuinte, débito, parcelamento, posição, vínculo ou sinalização, só a carga das fontes o grava; nenhum usuário o edita (RN-NOVO-ING-008). |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-01, RN-NOVO-ING-008 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o dado é de contribuinte, débito, parcelamento, posição, vínculo ou sinalização.
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Localize o registro de teste em que o dado é de contribuinte, débito, parcelamento, posição, vínculo ou sinalização.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ Só a carga das fontes o grava; nenhum usuário o edita.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-005] Validar o documento do contribuinte: documento válido com máscara [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um registro com CNPJ válido escrito com pontos e barra —, confirmar que, quando o lote é processado, o documento é gravado só com dígitos. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um registro com CNPJ válido escrito com pontos e barra.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um registro com CNPJ válido escrito com pontos e barra.
4. Execute: o lote é processado.
5. Volte à tela **Integrações & Sincronização** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O documento é gravado só com dígitos.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-006] Validar o documento do contribuinte: cPF válido de pessoa física [INTEGRAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um registro do IPVA com CPF válido —, confirmar que, quando o lote é processado, o contribuinte é gravado como pessoa física. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um registro do IPVA com CPF válido.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um registro do IPVA com CPF válido.
4. Execute: o lote é processado.
5. Volte à tela **Integrações & Sincronização** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O contribuinte é gravado como pessoa física.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-007] Validar o documento do contribuinte: dígito inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um registro com CPF de dígito errado —, confirmar que, quando o lote é processado, o registro vai para a lista de rejeitados com o motivo «CPF/CNPJ inválido». |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-02, RN-NOVO-ING-004 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um registro com CPF de dígito errado.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um registro com CPF de dígito errado.
4. Execute: o lote é processado.
5. Volte à tela **Integrações & Sincronização** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O registro vai para a lista de rejeitados com o motivo «CPF/CNPJ inválido».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-008] Cumprir a regra «Rejeição de documento inválido» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o CPF/CNPJ do registro tem dígito verificador inválido, o sistema rejeita o registro e devolve o motivo na resposta ao parceiro (RN-NOVO-ING-004). |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-02, RN-NOVO-ING-004 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o CPF/CNPJ do registro tem dígito verificador inválido.
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Localize o registro de teste em que o CPF/CNPJ do registro tem dígito verificador inválido.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ O sistema rejeita o registro e devolve o motivo na resposta ao parceiro.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-009] Validar o documento do contribuinte: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Integrações & Sincronização**.
3. Se a tela aparecer, tente: validar o documento do contribuinte.
4. Copie o endereço da tela **Integrações & Sincronização** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue validar o documento do contribuinte: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-010] Consolidar débitos por contribuinte: contribuinte em duas fontes [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o contribuinte tem um débito de ICMS na CCF e um de ITCD —, confirmar que, quando os dois lotes são processados, ele aparece uma vez, com posição em ICMS e em ITCD. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-03 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o contribuinte tem um débito de ICMS na CCF e um de ITCD.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Carteira Consolidada**.
3. Confirme que a situação de partida existe: o contribuinte tem um débito de ICMS na CCF e um de ITCD (dados do Anexo B).
4. Execute: os dois lotes são processados.
5. Observe o resultado na tela **Carteira Consolidada**.

**Resultado esperado:**
- ✅ Ele aparece uma vez, com posição em ICMS e em ITCD.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-011] Consolidar débitos por contribuinte: contribuinte novo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um documento que ainda não existe na base —, confirmar que, quando o débito é gravado, o sistema cria o contribuinte e a posição do tributo. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-03, RN-NOVO-ING-001 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um documento que ainda não existe na base.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Carteira Consolidada**.
3. Confirme que a situação de partida existe: um documento que ainda não existe na base (dados do Anexo B).
4. Execute: o débito é gravado.
5. Observe o resultado na tela **Carteira Consolidada**.

**Resultado esperado:**
- ✅ O sistema cria o contribuinte e a posição do tributo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-012] Consolidar débitos por contribuinte: mesmo débito pelo MPI e pelo Big Data [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o mesmo débito recebido pelas duas fontes —, confirmar que, quando os lotes são processados, a posição conta o débito uma vez só. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-03, RN-NOVO-ING-001 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o mesmo débito recebido pelas duas fontes.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Carteira Consolidada**.
3. Confirme que a situação de partida existe: o mesmo débito recebido pelas duas fontes (dados do Anexo B).
4. Execute: os lotes são processados.
5. Observe o resultado na tela **Carteira Consolidada**.

**Resultado esperado:**
- ✅ A posição conta o débito uma vez só.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-013] Juntar débitos de duas fontes no mesmo contribuinte e somar a posição do tributo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o cálculo da regra «Consolidação por contribuinte» com valores conhecidos (RN-NOVO-ING-001). |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-03, RN-NOVO-ING-001 |

**Pré-condições:**
- Contribuinte de teste `Empresa Sintética Ltda`, CNPJ `11.222.333/0001-81`, ainda sem débitos (Anexo B).
- Simulador de cargas disponível no ambiente de homologação.

**Passos:**
1. Entre com o perfil **Gestor de Integração** (Anexo A).
2. No simulador, gere um lote da CCF com 1 débito de ICMS Normal: CNPJ `11.222.333/0001-81` (com pontuação), valor `R$ 1.000,00`, vencido há `40` dias.
3. Gere um lote da SNE com 1 débito de ICMS Normal: CNPJ `11222333000181` (só números), valor `R$ 500,00`, vencido há `70` dias.
4. Feche os dois lotes e aguarde a consolidação.
5. Abra **Visão Única do Contribuinte** e pesquise o CNPJ `11.222.333/0001-81`.

**Resultado esperado:**
- ✅ Existe um único contribuinte com esse CNPJ — o documento com e sem pontuação foi reconhecido como o mesmo.
- ✅ A posição de ICMS Normal mostra total em aberto de `R$ 1.500,00` (1.000 + 500), maior atraso de `70` dias e `2` débitos.
- ✅ O total em aberto do contribuinte é `R$ 1.500,00` e o maior atraso é `70` dias.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-014] Consolidar débitos por contribuinte: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-03 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Carteira Consolidada**.
3. Se a tela aparecer, tente: consolidar débitos por contribuinte.
4. Copie o endereço da tela **Carteira Consolidada** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue consolidar débitos por contribuinte: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-015] Evitar duplicidade no reenvio: pacote reenviado [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o pacote 2 do lote 100 já foi gravado —, confirmar que, quando a fonte reenvia o pacote 2, nenhum débito é duplicado. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-04 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o pacote 2 do lote 100 já foi gravado.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: o pacote 2 do lote 100 já foi gravado.
4. Execute: a fonte reenvia o pacote 2.
5. Volte à tela **Integrações & Sincronização** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ Nenhum débito é duplicado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-016] Evitar duplicidade no reenvio: registro atualizado [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um débito já gravado —, confirmar que, quando a fonte envia o mesmo débito com novo valor em outro lote, o débito é atualizado, não duplicado. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-04, RN-NOVO-ING-005 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um débito já gravado.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um débito já gravado.
4. Execute: a fonte envia o mesmo débito com novo valor em outro lote.
5. Volte à tela **Integrações & Sincronização** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O débito é atualizado, não duplicado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-017] Evitar duplicidade no reenvio: pacote fora de sequência [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um lote que esperava 3 pacotes —, confirmar que, quando chega o pacote 5, o sistema recusa o pacote e informa a sequência esperada. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-04, RN-NOVO-ING-005 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um lote que esperava 3 pacotes.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um lote que esperava 3 pacotes.
4. Execute: chega o pacote 5.
5. Volte à tela **Integrações & Sincronização** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O sistema recusa o pacote e informa a sequência esperada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-018] Cumprir a regra «Reenvio não duplica» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando um lote ou registro já recebido chega de novo, pela mesma fonte, com o mesmo identificador, o sistema não cria débito, parcelamento nem sinalização em duplicidade (RN-NOVO-ING-005). |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-04, RN-NOVO-ING-005 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: um lote ou registro já recebido chega de novo, pela mesma fonte, com o mesmo identificador.
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Localize o registro de teste em que um lote ou registro já recebido chega de novo, pela mesma fonte, com o mesmo identificador.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ O sistema não cria débito, parcelamento nem sinalização em duplicidade.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-019] Evitar duplicidade no reenvio: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-04 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Integrações & Sincronização**.
3. Se a tela aparecer, tente: evitar duplicidade no reenvio.
4. Copie o endereço da tela **Integrações & Sincronização** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue evitar duplicidade no reenvio: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-020] Fechar o ciclo diário e acompanhar as fontes: todas entregaram [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — as seis fontes fecharam seus lotes até o horário-limite —, confirmar que, quando o ciclo fecha, todas aparecem como OK com a hora da última carga. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-05 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: as seis fontes fecharam seus lotes até o horário-limite.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: as seis fontes fecharam seus lotes até o horário-limite (dados do Anexo B).
4. Execute: o ciclo fecha.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ Todas aparecem como OK com a hora da última carga.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-021] Fechar o ciclo diário e acompanhar as fontes: lote parcial [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a fonte ITCD fechou o lote com rejeições —, confirmar que, quando o ciclo fecha, a fonte aparece como Parcial com a contagem de rejeitados. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-05, RN-NOVO-ING-006 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a fonte ITCD fechou o lote com rejeições.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: a fonte ITCD fechou o lote com rejeições (dados do Anexo B).
4. Execute: o ciclo fecha.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ A fonte aparece como Parcial com a contagem de rejeitados.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-022] Fechar o ciclo diário e acompanhar as fontes: fonte não entregou [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a fonte IPVA não enviou o lote até o horário-limite —, confirmar que, quando o ciclo fecha, a fonte fica em Falha e o Gestor de Integração recebe alerta. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-05, RN-NOVO-ING-006 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a fonte IPVA não enviou o lote até o horário-limite.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: a fonte IPVA não enviou o lote até o horário-limite (dados do Anexo B).
4. Execute: o ciclo fecha.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ A fonte fica em Falha e o Gestor de Integração recebe alerta.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-023] Fechar o ciclo diário e acompanhar as fontes: campo Data do lote inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Data do lote quando intervalo acima de 90 dias e explica o que corrigir. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-05 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e comece a ação: fechar o ciclo diário e acompanhar as fontes.
3. Preencha o campo **Data do lote** de forma que fique nesta situação: intervalo acima de 90 dias; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Escolha no máximo 90 dias» junto do campo **Data do lote**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-024] Cumprir a regra «Falha de uma fonte não para as outras» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando uma fonte não entrega no prazo ou falha, o sistema marca a fonte em falha, abre alerta, mantém a última carga válida dela e consolida as demais (RN-NOVO-ING-006). |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-05, RN-NOVO-ING-006 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: uma fonte não entrega no prazo ou falha.
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Localize o registro de teste em que uma fonte não entrega no prazo ou falha.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ O sistema marca a fonte em falha, abre alerta, mantém a última carga válida dela e consolida as demais.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-025] Fechar o ciclo diário e acompanhar as fontes: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-05 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Integrações & Sincronização**.
3. Se a tela aparecer, tente: fechar o ciclo diário e acompanhar as fontes.
4. Copie o endereço da tela **Integrações & Sincronização** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue fechar o ciclo diário e acompanhar as fontes: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-026] Seguir operando com fonte em falha: uma fonte falha [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a fonte SNE ficou em Falha —, confirmar que, quando o ciclo consolida, as outras cinco fontes são consolidadas e ficam OK. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-06 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a fonte SNE ficou em Falha.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: a fonte SNE ficou em Falha (dados do Anexo B).
4. Execute: o ciclo consolida.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ As outras cinco fontes são consolidadas e ficam OK.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-027] Seguir operando com fonte em falha: fonte volta no dia seguinte [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a fonte SNE falhou ontem —, confirmar que, quando ela entrega hoje, a carga de hoje substitui a última carga válida. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-06, RN-NOVO-ING-006 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a fonte SNE falhou ontem.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: a fonte SNE falhou ontem (dados do Anexo B).
4. Execute: ela entrega hoje.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ A carga de hoje substitui a última carga válida.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-028] Seguir operando com fonte em falha: nenhuma carga válida [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma fonte que nunca entregou lote válido —, confirmar que, quando o ciclo consolida, a fonte aparece sem dados e o alerta indica «sem carga válida». |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-06, RN-NOVO-ING-006 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma fonte que nunca entregou lote válido.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: uma fonte que nunca entregou lote válido (dados do Anexo B).
4. Execute: o ciclo consolida.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ A fonte aparece sem dados e o alerta indica «sem carga válida».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-029] Seguir operando com fonte em falha: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-06 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Integrações & Sincronização**.
3. Se a tela aparecer, tente: seguir operando com fonte em falha.
4. Copie o endereço da tela **Integrações & Sincronização** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue seguir operando com fonte em falha: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-030] Carga inicial e reconciliação: carga inicial conferida [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a CCF enviou o histórico em 50 pacotes —, confirmar que, quando o lote fecha, o Gestor de Integração vê os totais por tributo para conferir com a fonte. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-07 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a CCF enviou o histórico em 50 pacotes.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: a CCF enviou o histórico em 50 pacotes (dados do Anexo B).
4. Execute: o lote fecha.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ O Gestor de Integração vê os totais por tributo para conferir com a fonte.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-031] Carga inicial e reconciliação: carga inicial em 3 lotes [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o histórico do IPVA veio em 3 lotes —, confirmar que, quando os 3 fecham, os totais somam os 3 lotes. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-07, RN-NOVO-ING-005 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o histórico do IPVA veio em 3 lotes.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: o histórico do IPVA veio em 3 lotes (dados do Anexo B).
4. Execute: os 3 fecham.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ Os totais somam os 3 lotes.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-032] Carga inicial e reconciliação: total divergente [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a fonte informa um total diferente do gravado —, confirmar que, quando o lote fecha, o lote fica Parcial e a divergência aparece na conferência. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-07, RN-NOVO-ING-005 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a fonte informa um total diferente do gravado.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: a fonte informa um total diferente do gravado (dados do Anexo B).
4. Execute: o lote fecha.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ O lote fica Parcial e a divergência aparece na conferência.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-033] Carga inicial e reconciliação: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-07 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Integrações & Sincronização**.
3. Se a tela aparecer, tente: carga inicial e reconciliação.
4. Copie o endereço da tela **Integrações & Sincronização** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue carga inicial e reconciliação: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-034] Reprocessar registros rejeitados: reprocesso aceito [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um registro rejeitado por «Contribuinte não encontrado» —, confirmar que, quando o contribuinte já existe e o gestor aciona o reprocesso, o registro é gravado e sai da lista de rejeitados. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-08 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um registro rejeitado por «Contribuinte não encontrado».

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: um registro rejeitado por «Contribuinte não encontrado» (dados do Anexo B).
4. Execute: o contribuinte já existe e o gestor aciona o reprocesso.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ O registro é gravado e sai da lista de rejeitados.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-035] Reprocessar registros rejeitados: reprocesso em lote [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — 10 registros rejeitados do mesmo lote —, confirmar que, quando o gestor seleciona os 10 e reprocessa, cada um é revalidado e o resultado aparece por registro. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-08, RN-NOVO-ING-004 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: 10 registros rejeitados do mesmo lote.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: 10 registros rejeitados do mesmo lote (dados do Anexo B).
4. Execute: o gestor seleciona os 10 e reprocessa.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ Cada um é revalidado e o resultado aparece por registro.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-036] Reprocessar registros rejeitados: reprocesso falha de novo [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um registro com CPF de dígito inválido —, confirmar que, quando o gestor reprocessa, ele continua rejeitado com o mesmo motivo. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-08, RN-NOVO-ING-004 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um registro com CPF de dígito inválido.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: um registro com CPF de dígito inválido (dados do Anexo B).
4. Execute: o gestor reprocessa.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ Ele continua rejeitado com o mesmo motivo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-037] Reprocessar registros rejeitados: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-08 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Integrações & Sincronização**.
3. Se a tela aparecer, tente: reprocessar registros rejeitados.
4. Copie o endereço da tela **Integrações & Sincronização** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue reprocessar registros rejeitados: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-038] Atualizar a regularização durante o ciclo: regularização total [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte em régua com um único débito —, confirmar que, quando a carga mostra o débito regularizado, a régua e o caso são encerrados. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-09 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte em régua com um único débito.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um contribuinte em régua com um único débito (dados do Anexo B).
4. Execute: a carga mostra o débito regularizado.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ A régua e o caso são encerrados.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-039] Atualizar a regularização durante o ciclo: regularização parcial [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte com dois débitos —, confirmar que, quando só um é regularizado, ele continua na régua pelo débito em aberto. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-09, RN-NOVO-ING-002 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte com dois débitos.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um contribuinte com dois débitos (dados do Anexo B).
4. Execute: só um é regularizado.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ Ele continua na régua pelo débito em aberto.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-040] Atualizar a regularização durante o ciclo: comunicação já agendada [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma etapa de régua prevista para hoje —, confirmar que, quando o contribuinte regularizou na carga do dia, a etapa não é enviada. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-09, RN-NOVO-ING-002 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma etapa de régua prevista para hoje.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: uma etapa de régua prevista para hoje (dados do Anexo B).
4. Execute: o contribuinte regularizou na carga do dia.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ A etapa não é enviada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-041] Atualizar a regularização durante o ciclo: campo Situação da cobrança inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Situação da cobrança quando vazio e explica o que corrigir. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-09 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte** e comece a ação: atualizar a regularização durante o ciclo.
3. Deixe o campo **Situação da cobrança** em branco; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Preencha este campo» junto do campo **Situação da cobrança**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-042] Cumprir a regra «Regularização encerra a abordagem no ciclo» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando a carga do dia mostra o débito regularizado, o sistema encerra o caso e a régua do contribuinte e não o aborda mais naquele ciclo (RN-NOVO-ING-002). |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-09, RN-NOVO-ING-002 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: a carga do dia mostra o débito regularizado.
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Localize o registro de teste em que a carga do dia mostra o débito regularizado.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ O sistema encerra o caso e a régua do contribuinte e não o aborda mais naquele ciclo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-043] Atualizar a regularização durante o ciclo: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-09 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Visão Única do Contribuinte**.
3. Se a tela aparecer, tente: atualizar a regularização durante o ciclo.
4. Copie o endereço da tela **Visão Única do Contribuinte** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue atualizar a regularização durante o ciclo: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-044] Alertar parcelamento em risco: parcela vencida [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um parcelamento ativo —, confirmar que, quando a carga mostra uma parcela vencida, o parcelamento e a posição do tributo ficam «Em risco». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-10 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um parcelamento ativo.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um parcelamento ativo (dados do Anexo B).
4. Execute: a carga mostra uma parcela vencida.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ O parcelamento e a posição do tributo ficam «Em risco».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-045] Alertar parcelamento em risco: parcela quitada [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um parcelamento «Em risco» —, confirmar que, quando a carga mostra a parcela paga, ele volta a «Ativo». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-10 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um parcelamento «Em risco».

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um parcelamento «Em risco» (dados do Anexo B).
4. Execute: a carga mostra a parcela paga.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ Ele volta a «Ativo».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-046] Alertar parcelamento em risco: parcelamento encerrado [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um parcelamento encerrado —, confirmar que, quando a carga traz parcela vencida antiga, ele não é marcado como em risco. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-10 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um parcelamento encerrado.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um parcelamento encerrado (dados do Anexo B).
4. Execute: a carga traz parcela vencida antiga.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ Ele não é marcado como em risco.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-047] Alertar parcelamento em risco: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-10 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Visão Única do Contribuinte**.
3. Se a tela aparecer, tente: alertar parcelamento em risco.
4. Copie o endereço da tela **Visão Única do Contribuinte** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue alertar parcelamento em risco: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-048] Transição MPI → Big Data: débito só no MPI [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um débito que só o MPI envia —, confirmar que, quando o lote é processado, o débito entra na posição do contribuinte. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-11 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um débito que só o MPI envia.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: um débito que só o MPI envia (dados do Anexo B).
4. Execute: o lote é processado.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ O débito entra na posição do contribuinte.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-049] Transição MPI → Big Data: percentual de migração [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o MPI informa 60% das regras migradas —, confirmar que, quando o lote fecha, a fonte MPI mostra 60% de migração. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-11, RN-NOVO-ING-003 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o MPI informa 60% das regras migradas.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: o MPI informa 60% das regras migradas (dados do Anexo B).
4. Execute: o lote fecha.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ A fonte MPI mostra 60% de migração.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-050] Transição MPI → Big Data: débito nas duas fontes [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o mesmo débito pelo MPI e pelo Big Data —, confirmar que, quando os lotes são processados, existe um único débito. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-11, RN-NOVO-ING-003 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o mesmo débito pelo MPI e pelo Big Data.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: o mesmo débito pelo MPI e pelo Big Data (dados do Anexo B).
4. Execute: os lotes são processados.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ Existe um único débito.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-051] Cumprir a regra «Continuidade na transição MPI → Big Data» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o mesmo débito chega pelo MPI e pelo Big Data, o sistema mantém um único débito, sem ruptura da carteira (RN-NOVO-ING-003). |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-11, RN-NOVO-ING-003 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o mesmo débito chega pelo MPI e pelo Big Data.
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Localize o registro de teste em que o mesmo débito chega pelo MPI e pelo Big Data.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ O sistema mantém um único débito, sem ruptura da carteira.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-052] Transição MPI → Big Data: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-11 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Integrações & Sincronização**.
3. Se a tela aparecer, tente: transição mpi → big data.
4. Copie o endereço da tela **Integrações & Sincronização** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue transição mpi → big data: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-053] Receber sinalização coercitiva: sinalização ativa [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um protesto via PGE enviado pela SNE —, confirmar que, quando o atendente abre o dossiê, vê a sinalização ativa com tipo e data. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-12 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um protesto via PGE enviado pela SNE.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um protesto via PGE enviado pela SNE (dados do Anexo B).
4. Execute: o atendente abre o dossiê.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ Vê a sinalização ativa com tipo e data.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-054] Receber sinalização coercitiva: sinalização encerrada [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma sinalização marcada como inativa pela fonte —, confirmar que, quando o dossiê é aberto, ela aparece no histórico como encerrada. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-12 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma sinalização marcada como inativa pela fonte.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: uma sinalização marcada como inativa pela fonte (dados do Anexo B).
4. Execute: o dossiê é aberto.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ Ela aparece no histórico como encerrada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-055] Receber sinalização coercitiva: tentativa de ação [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma sinalização no dossiê —, confirmar que, quando o atendente procura uma ação sobre ela, não existe ação disponível, só leitura. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-12, RN-NOVO-ING-007 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma sinalização no dossiê.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: uma sinalização no dossiê (dados do Anexo B).
4. Execute: o atendente procura uma ação sobre ela.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ Não existe ação disponível, só leitura.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-056] Cumprir a regra «Sinalização coercitiva é só informativa» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o contribuinte tem sinalização de cobrança coercitiva de outra coordenadoria, o sistema mostra a sinalização e não executa nenhuma ação sobre ela (RN-NOVO-ING-007). |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-12, RN-NOVO-ING-007 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o contribuinte tem sinalização de cobrança coercitiva de outra coordenadoria.
- Usuário de teste do perfil Atendente disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Localize o registro de teste em que o contribuinte tem sinalização de cobrança coercitiva de outra coordenadoria.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ O sistema mostra a sinalização e não executa nenhuma ação sobre ela.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-057] Receber sinalização coercitiva: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Administrador não executa esta funcionalidade, porque o Administrador não tem acesso operacional a casos. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-INGESTAO-12 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Administrador** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Visão Única do Contribuinte**.
3. Se a tela aparecer, tente: receber sinalização coercitiva.
4. Copie o endereço da tela **Visão Única do Contribuinte** aberto pelo perfil autorizado, cole no navegador do perfil Administrador e tente de novo.

**Resultado esperado:**
- ✅ O perfil Administrador não consegue receber sinalização coercitiva: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-058] Visão única do contribuinte: contribuinte com histórico [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte com débitos em duas fontes e duas comunicações —, confirmar que, quando o coordenador abre o formulário, vê débitos, parcelamentos, comunicações e sinalizações em listas. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-13 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte com débitos em duas fontes e duas comunicações.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um contribuinte com débitos em duas fontes e duas comunicações (dados do Anexo B).
4. Execute: o coordenador abre o formulário.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ Vê débitos, parcelamentos, comunicações e sinalizações em listas.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-059] Visão única do contribuinte: contribuinte sem comunicação [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte nunca cobrado —, confirmar que, quando o formulário é aberto, a lista de comunicações mostra «Nenhuma comunicação enviada». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-13, RN-NOVO-ING-001, RN-NOVO-GOV-001 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte nunca cobrado.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um contribuinte nunca cobrado (dados do Anexo B).
4. Execute: o formulário é aberto.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ A lista de comunicações mostra «Nenhuma comunicação enviada».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-060] Visão única do contribuinte: atendente sem o caso [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um atendente sem caso deste contribuinte —, confirmar que, quando tenta abrir o formulário, o sistema nega o acesso. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-13, RN-NOVO-ING-001, RN-NOVO-GOV-001 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um atendente sem caso deste contribuinte.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um atendente sem caso deste contribuinte (dados do Anexo B).
4. Execute: tenta abrir o formulário.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ O sistema nega o acesso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-061] Visão única do contribuinte: campo Tipo de pessoa inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Tipo de pessoa quando vazio e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-13 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte** e comece a ação: visão única do contribuinte.
3. Deixe o campo **Tipo de pessoa** em branco; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Preencha este campo» junto do campo **Tipo de pessoa**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-062] Cumprir a regra «Acesso na camada de dados» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando um usuário consulta qualquer dado, a permissão do papel dele é avaliada no próprio dado, não só no menu (RN-NOVO-GOV-001). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-13, RN-NOVO-GOV-001 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: um usuário consulta qualquer dado.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Localize o registro de teste em que um usuário consulta qualquer dado.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ A permissão do papel dele é avaliada no próprio dado, não só no menu.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-063] Visão única do contribuinte: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-13 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Visão Única do Contribuinte**.
3. Se a tela aparecer, tente: visão única do contribuinte.
4. Copie o endereço da tela **Visão Única do Contribuinte** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue visão única do contribuinte: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-064] Carteira consolidada: filtro por tributo [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a carteira consolidada —, confirmar que, quando o coordenador filtra ICMS Normal com atraso acima de 90 dias, vê só essas posições, ordenadas por valor. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-14 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a carteira consolidada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Carteira Consolidada**.
3. Confirme que a situação de partida existe: a carteira consolidada (dados do Anexo B).
4. Execute: o coordenador filtra ICMS Normal com atraso acima de 90 dias.
5. Observe o resultado na tela **Carteira Consolidada**.

**Resultado esperado:**
- ✅ Vê só essas posições, ordenadas por valor.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-065] Carteira consolidada: filtro salvo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um filtro salvo «IPVA acima de R$ 5 mil» —, confirmar que, quando o coordenador o seleciona, a lista aplica o filtro. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-14 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um filtro salvo «IPVA acima de R$ 5 mil».

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Carteira Consolidada**.
3. Confirme que a situação de partida existe: um filtro salvo «IPVA acima de R$ 5 mil» (dados do Anexo B).
4. Execute: o coordenador o seleciona.
5. Observe o resultado na tela **Carteira Consolidada**.

**Resultado esperado:**
- ✅ A lista aplica o filtro.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-066] Carteira consolidada: filtro sem resultado [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um filtro que não encontra posições —, confirmar que, quando é aplicado, a lista mostra «Nenhuma posição encontrada para os filtros». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-14 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um filtro que não encontra posições.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Carteira Consolidada**.
3. Confirme que a situação de partida existe: um filtro que não encontra posições (dados do Anexo B).
4. Execute: é aplicado.
5. Observe o resultado na tela **Carteira Consolidada**.

**Resultado esperado:**
- ✅ A lista mostra «Nenhuma posição encontrada para os filtros».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-067] Carteira consolidada: campo Atraso mínimo (dias) inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Atraso mínimo (dias) quando negativo e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-14 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Carteira Consolidada** e comece a ação: carteira consolidada.
3. Preencha o campo **Atraso mínimo (dias)** de forma que fique nesta situação: negativo; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Informe zero ou mais dias» junto do campo **Atraso mínimo (dias)**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-068] Carteira consolidada: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-14 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Carteira Consolidada**.
3. Se a tela aparecer, tente: carteira consolidada.
4. Copie o endereço da tela **Carteira Consolidada** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue carteira consolidada: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-069] Simular cargas das fontes: lote simulado válido [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o ambiente de testes —, confirmar que, quando o gestor gera um lote simulado da CCF, o lote passa pelas mesmas validações e grava os débitos. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-15 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o ambiente de testes.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: o ambiente de testes (dados do Anexo B).
4. Execute: o gestor gera um lote simulado da CCF.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ O lote passa pelas mesmas validações e grava os débitos.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-070] Simular cargas das fontes: lote com inválidos [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um lote simulado com 5% de documentos inválidos —, confirmar que, quando é processado, os inválidos aparecem como rejeitados. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-15, RN-NOVO-ING-004, RN-NOVO-ING-005 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um lote simulado com 5% de documentos inválidos.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: um lote simulado com 5% de documentos inválidos (dados do Anexo B).
4. Execute: é processado.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ Os inválidos aparecem como rejeitados.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-071] Simular cargas das fontes: ambiente de produção [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o ambiente de produção —, confirmar que, quando alguém tenta gerar lote simulado, a opção não existe. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-INGESTAO-15, RN-NOVO-ING-004, RN-NOVO-ING-005 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o ambiente de produção.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização**.
3. Confirme que a situação de partida existe: o ambiente de produção (dados do Anexo B).
4. Execute: alguém tenta gerar lote simulado.
5. Observe o resultado na tela **Integrações & Sincronização**.

**Resultado esperado:**
- ✅ A opção não existe.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-072] Simular cargas das fontes: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-INGESTAO-15 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Integrações & Sincronização**.
3. Se a tela aparecer, tente: simular cargas das fontes.
4. Copie o endereço da tela **Integrações & Sincronização** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue simular cargas das fontes: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-073] Estados da tela Integrações & Sincronização [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Integrações & Sincronização mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-INGESTAO-01, RF-MOD-INGESTAO-02, RF-MOD-INGESTAO-04 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A) e abra **Cobrança Inteligente › Integrações & Sincronização**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-074] Estados da tela Carteira Consolidada [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Carteira Consolidada mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-14, RF-MOD-INGESTAO-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A) e abra **Cobrança Inteligente › Carteira Consolidada**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-075] Estados da tela Visão Única do Contribuinte [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Visão Única do Contribuinte mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-INGESTAO-13, RF-MOD-INGESTAO-09, RF-MOD-INGESTAO-10 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A) e abra **Cobrança Inteligente › Visão Única do Contribuinte**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

## [EPIC-002] — Qualificação e Parametrização da Carteira

> **Descrição da épica:** testes de homologação do módulo Qualificação e Parametrização da Carteira (MOD-QUALIFICACAO): 6 funcionalidades e 2 telas.

### Pré-requisitos da Épica

- Ambiente de homologação disponível, com a massa de dados do Anexo B carregada e sem dado pessoal real.
- Usuários de teste dos perfis do Anexo A criados.

---

### [TC-076] Parametrizar critérios da carteira: rascunho completo [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um rascunho aberto —, confirmar que, quando o coordenador define ICMS Normal, valor mínimo R$ 10 mil e atraso de 60 dias, o rascunho guarda os critérios. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-01 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um rascunho aberto.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação**.
3. Confirme que a situação de partida existe: um rascunho aberto (dados do Anexo B).
4. Execute: o coordenador define ICMS Normal, valor mínimo R$ 10 mil e atraso de 60 dias.
5. Observe o resultado na tela **Critérios de Qualificação**.

**Resultado esperado:**
- ✅ O rascunho guarda os critérios.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-077] Parametrizar critérios da carteira: sem limite de score [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um rascunho —, confirmar que, quando o coordenador deixa o limite de score vazio, a carteira não filtra por score. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-01, RN-NOVO-QUA-001, RN-NOVO-QUA-004 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um rascunho.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação**.
3. Confirme que a situação de partida existe: um rascunho (dados do Anexo B).
4. Execute: o coordenador deixa o limite de score vazio.
5. Observe o resultado na tela **Critérios de Qualificação**.

**Resultado esperado:**
- ✅ A carteira não filtra por score.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-078] Parametrizar critérios da carteira: valor negativo [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um rascunho —, confirmar que, quando o coordenador informa valor mínimo negativo, o sistema recusa e mostra «O valor mínimo deve ser zero ou maior». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-01, RN-NOVO-QUA-001, RN-NOVO-QUA-004 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um rascunho.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação**.
3. Confirme que a situação de partida existe: um rascunho (dados do Anexo B).
4. Execute: o coordenador informa valor mínimo negativo.
5. Observe o resultado na tela **Critérios de Qualificação**.

**Resultado esperado:**
- ✅ O sistema recusa e mostra «O valor mínimo deve ser zero ou maior».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-079] Parametrizar critérios da carteira: campo Tributos inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Tributos quando nenhum e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-01 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação** e comece a ação: parametrizar critérios da carteira.
3. Preencha o campo **Tributos** de forma que fique nesta situação: nenhum; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Escolha ao menos um tributo» junto do campo **Tributos**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-080] Cumprir a regra «Critérios configuráveis e versionados» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando a carteira é formada, ela usa uma versão publicada de critérios, numerada e auditável (RN-NOVO-QUA-001). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-01, RN-NOVO-QUA-001 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: a carteira é formada.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação**.
3. Localize o registro de teste em que a carteira é formada.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Critérios de Qualificação**.

**Resultado esperado:**
- ✅ Ela usa uma versão publicada de critérios, numerada e auditável.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-081] Entrar na carteira só quem atende a todos os critérios da versão [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o cálculo da regra «Aplicação dos critérios» com valores conhecidos (RN-NOVO-QUA-004). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-01, RN-NOVO-QUA-004 |

**Pré-condições:**
- Versão de critérios com: valor mínimo `R$ 5.000,00`, tributo `ICMS Normal`, atraso mínimo `60` dias, instrumento `Todos`, excluir contumazes `Sim`, score mínimo `0,50`.
- Cinco contribuintes de teste com ICMS Normal vencido há `90` dias (Anexo B): A com `R$ 8.000,00` e score `0,70`; B com `R$ 4.000,00` e score `0,90`; C com `R$ 9.000,00`, score `0,80` e marca de contumaz; D com `R$ 6.000,00` e sem score; E com `R$ 7.000,00` e score `0,30`.

**Passos:**
1. Entre com o perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Critérios de Qualificação** e selecione a versão de teste.
3. Clique em **Simular carteira**.
4. Abra **Prévia da Carteira Segmentada** e filtre pelos cinco contribuintes de teste.

**Resultado esperado:**
- ✅ Entram `2` contribuintes: A (atende a tudo) e D (sem score, segue sem o filtro de score).
- ✅ B fica fora pelo valor (R$ 4.000,00 < R$ 5.000,00); C fica fora por ser contumaz; E fica fora pelo score (0,30 < 0,50).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-082] Parametrizar critérios da carteira: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-01 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Critérios de Qualificação**.
3. Se a tela aparecer, tente: parametrizar critérios da carteira.
4. Copie o endereço da tela **Critérios de Qualificação** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue parametrizar critérios da carteira: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-083] Versionar critérios: publicação [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um rascunho com prévia vigente —, confirmar que, quando o coordenador publica com fundamentação, nasce a versão seguinte, publicada e imutável. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um rascunho com prévia vigente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação**.
3. Confirme que a situação de partida existe: um rascunho com prévia vigente (dados do Anexo B).
4. Execute: o coordenador publica com fundamentação.
5. Observe o resultado na tela **Critérios de Qualificação**.

**Resultado esperado:**
- ✅ Nasce a versão seguinte, publicada e imutável.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-084] Versionar critérios: nova versão a partir da publicada [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a versão 3 publicada —, confirmar que, quando o coordenador cria um rascunho, o rascunho parte dos critérios da versão 3. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a versão 3 publicada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação**.
3. Confirme que a situação de partida existe: a versão 3 publicada (dados do Anexo B).
4. Execute: o coordenador cria um rascunho.
5. Observe o resultado na tela **Critérios de Qualificação**.

**Resultado esperado:**
- ✅ O rascunho parte dos critérios da versão 3.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-085] Versionar critérios: sem fundamentação [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um rascunho com prévia —, confirmar que, quando o coordenador publica sem fundamentação, o sistema recusa e mostra «Informe a fundamentação para publicar». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um rascunho com prévia.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação**.
3. Confirme que a situação de partida existe: um rascunho com prévia (dados do Anexo B).
4. Execute: o coordenador publica sem fundamentação.
5. Observe o resultado na tela **Critérios de Qualificação**.

**Resultado esperado:**
- ✅ O sistema recusa e mostra «Informe a fundamentação para publicar».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-086] Versionar critérios: campo Fundamentação inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Fundamentação quando vazio ao publicar e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação** e comece a ação: versionar critérios.
3. Deixe o campo **Fundamentação** em branco; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Informe a fundamentação para publicar» junto do campo **Fundamentação**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-087] Versionar critérios: limites do campo Fundamentação [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o comportamento nos limites do campo Fundamentação (até 2000 caracteres). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação** e comece a ação: versionar critérios.
3. Preencha o campo **Fundamentação**, um de cada vez, com um texto com exatamente `2000` caracteres e outro com `2001` caracteres, e clique em **Salvar** a cada tentativa.

**Resultado esperado:**
- ✅ O texto com 2000 caracteres é aceito inteiro.
- ✅ O campo não deixa passar do caractere 2000: o 2001º não entra ou a tela avisa o limite.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-088] Cumprir a regra «Versão publicada e carteira confirmada são imutáveis» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando a versão foi publicada ou a carteira foi confirmada, ninguém pode alterá-la nem excluí-la; mudar critérios cria nova versão a partir da última publicada (RN-NOVO-QUA-005). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-02, RN-NOVO-QUA-005 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: a versão foi publicada ou a carteira foi confirmada.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação**.
3. Localize o registro de teste em que a versão foi publicada ou a carteira foi confirmada.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Critérios de Qualificação**.

**Resultado esperado:**
- ✅ Ninguém pode alterá-la nem excluí-la; mudar critérios cria nova versão a partir da última publicada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-089] Cumprir a regra «Prévia vigente para publicar» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando os parâmetros do rascunho mudam depois da prévia, a prévia deixa de valer e a publicação fica bloqueada até nova prévia (RN-NOVO-QUA-006). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-02, RN-NOVO-QUA-006 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: os parâmetros do rascunho mudam depois da prévia.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Critérios de Qualificação**.
3. Localize o registro de teste em que os parâmetros do rascunho mudam depois da prévia.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Critérios de Qualificação**.

**Resultado esperado:**
- ✅ A prévia deixa de valer e a publicação fica bloqueada até nova prévia.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-090] Versionar critérios: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Critérios de Qualificação**.
3. Se a tela aparecer, tente: versionar critérios.
4. Copie o endereço da tela **Critérios de Qualificação** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue versionar critérios: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-091] Simular a carteira: prévia gerada [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um rascunho —, confirmar que, quando o coordenador gera a prévia, vê quantos contribuintes entram por segmento e por tributo. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um rascunho.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: um rascunho (dados do Anexo B).
4. Execute: o coordenador gera a prévia.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ Vê quantos contribuintes entram por segmento e por tributo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-092] Simular a carteira: prévia refeita [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma prévia gerada —, confirmar que, quando o coordenador muda um parâmetro, a prévia anterior perde a validade e ele precisa gerar outra. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma prévia gerada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: uma prévia gerada (dados do Anexo B).
4. Execute: o coordenador muda um parâmetro.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ A prévia anterior perde a validade e ele precisa gerar outra.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-093] Simular a carteira: prévia vazia [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — critérios que ninguém atende —, confirmar que, quando a prévia é gerada, o sistema mostra «Nenhum contribuinte atende aos critérios». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-03, RN-NOVO-QUA-004, RN-NOVO-QUA-006 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: critérios que ninguém atende.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: critérios que ninguém atende (dados do Anexo B).
4. Execute: a prévia é gerada.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ O sistema mostra «Nenhum contribuinte atende aos critérios».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-094] Simular a carteira: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-03 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Prévia da Carteira Segmentada**.
3. Se a tela aparecer, tente: simular a carteira.
4. Copie o endereço da tela **Prévia da Carteira Segmentada** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue simular a carteira: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-095] Segmentar massificada × qualificada: segmentação [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma versão com tipo-alvo qualificada para valores acima de R$ 500 mil —, confirmar que, quando a carteira é gerada, esses contribuintes ficam na qualificada e os demais na massificada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-04 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma versão com tipo-alvo qualificada para valores acima de R$ 500 mil.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: uma versão com tipo-alvo qualificada para valores acima de R$ 500 mil (dados do Anexo B).
4. Execute: a carteira é gerada.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ Esses contribuintes ficam na qualificada e os demais na massificada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-096] Segmentar massificada × qualificada: sem qualificada [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma versão só com tipo-alvo massificada —, confirmar que, quando a carteira é gerada, todos ficam na massificada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-04, RN-NOVO-QUA-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma versão só com tipo-alvo massificada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: uma versão só com tipo-alvo massificada (dados do Anexo B).
4. Execute: a carteira é gerada.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ Todos ficam na massificada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-097] Segmentar massificada × qualificada: contribuinte nos dois critérios [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte que atende aos dois segmentos —, confirmar que, quando a carteira é gerada, ele fica num único segmento e o caso vai para revisão (desempate pendente, QA-01). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-04, RN-NOVO-QUA-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte que atende aos dois segmentos.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: um contribuinte que atende aos dois segmentos (dados do Anexo B).
4. Execute: a carteira é gerada.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ Ele fica num único segmento e o caso vai para revisão (desempate pendente, QA-01).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-098] Cumprir a regra «Um eixo por contribuinte no ciclo» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o contribuinte entra na carteira, ele fica em um único segmento (massificada ou qualificada) naquele ciclo, conforme o tipo-alvo da versão (RN-NOVO-QUA-002). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-04, RN-NOVO-QUA-002 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o contribuinte entra na carteira.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Localize o registro de teste em que o contribuinte entra na carteira.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ Ele fica em um único segmento (massificada ou qualificada) naquele ciclo, conforme o tipo-alvo da versão.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-099] Segmentar massificada × qualificada: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-04 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Prévia da Carteira Segmentada**.
3. Se a tela aparecer, tente: segmentar massificada × qualificada.
4. Copie o endereço da tela **Prévia da Carteira Segmentada** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue segmentar massificada × qualificada: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-100] Sortear o grupo de controle: sorteio padrão [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma carteira de 10.000 contribuintes e parâmetro de 3% —, confirmar que, quando o sorteio roda, 300 itens ficam como controle. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-05 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma carteira de 10.000 contribuintes e parâmetro de 3%.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: uma carteira de 10.000 contribuintes e parâmetro de 3% (dados do Anexo B).
4. Execute: o sorteio roda.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ 300 itens ficam como controle.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-101] Sortear o grupo de controle: sorteio refeito [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a semente gravada da carteira —, confirmar que, quando o sorteio é refeito, o mesmo grupo é sorteado. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-05, RN-NOVO-QUA-003 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a semente gravada da carteira.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: a semente gravada da carteira (dados do Anexo B).
4. Execute: o sorteio é refeito.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ O mesmo grupo é sorteado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-102] Sortear o grupo de controle: controle não é cobrado [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um item do grupo de controle —, confirmar que, quando a carteira é confirmada, ele não entra em régua nem vira caso. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-05 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um item do grupo de controle.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: um item do grupo de controle (dados do Anexo B).
4. Execute: a carteira é confirmada.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ Ele não entra em régua nem vira caso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-103] Sortear 3% da carteira como grupo de controle, arredondando para cima [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o cálculo da regra «Sorteio do grupo de controle» com valores conhecidos (RN-NOVO-QUA-003). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-05, RN-NOVO-QUA-003 |

**Pré-condições:**
- Parâmetro do grupo de controle em `3%` (padrão).
- Versão de critérios publicada que gera exatamente `1.001` itens na carteira (massa do Anexo B).

**Passos:**
1. Entre com o perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Prévia da Carteira Segmentada** e simule a carteira do ciclo com a versão publicada.
3. Confirme a carteira.
4. Filtre os itens marcados como **Grupo de controle** e anote a quantidade e a semente do sorteio mostrada na carteira.
5. Peça ao Gestor de Integração para refazer o sorteio no ambiente de homologação com a mesma semente e compare os itens sorteados.

**Resultado esperado:**
- ✅ São marcados `31` itens como grupo de controle: 3% de 1.001 é 30,03, arredondado para cima.
- ✅ A semente do sorteio aparece gravada na carteira.
- ✅ Com a mesma semente, os mesmos 31 itens são sorteados.
- ✅ Nenhum item do grupo de controle recebe régua nem vira caso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-104] Sortear o grupo de controle: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-05 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Prévia da Carteira Segmentada**.
3. Se a tela aparecer, tente: sortear o grupo de controle.
4. Copie o endereço da tela **Prévia da Carteira Segmentada** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue sortear o grupo de controle: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-105] Confirmar a carteira: confirmação [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma carteira gerada com a versão 4 publicada —, confirmar que, quando o coordenador confirma, as réguas começam no próximo ciclo e os casos são criados. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-06 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma carteira gerada com a versão 4 publicada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: uma carteira gerada com a versão 4 publicada (dados do Anexo B).
4. Execute: o coordenador confirma.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ As réguas começam no próximo ciclo e os casos são criados.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-106] Confirmar a carteira: carteira já confirmada [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma carteira confirmada —, confirmar que, quando alguém tenta alterá-la, o sistema recusa, porque a carteira confirmada é imutável. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-06 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma carteira confirmada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: uma carteira confirmada (dados do Anexo B).
4. Execute: alguém tenta alterá-la.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ O sistema recusa, porque a carteira confirmada é imutável.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-107] Confirmar a carteira: versão em rascunho [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma carteira simulada com rascunho —, confirmar que, quando o coordenador tenta confirmar, o sistema recusa e mostra «Só é possível confirmar com versão publicada». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-06 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma carteira simulada com rascunho.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: uma carteira simulada com rascunho (dados do Anexo B).
4. Execute: o coordenador tenta confirmar.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ O sistema recusa e mostra «Só é possível confirmar com versão publicada».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-108] Confirmar a carteira: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-06 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Prévia da Carteira Segmentada**.
3. Se a tela aparecer, tente: confirmar a carteira.
4. Copie o endereço da tela **Prévia da Carteira Segmentada** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue confirmar a carteira: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-109] Estados da tela Critérios de Qualificação [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Critérios de Qualificação mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-01, RF-MOD-QUALIFICACAO-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A) e abra **Cobrança Inteligente › Critérios de Qualificação**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-110] Estados da tela Prévia da Carteira Segmentada [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Prévia da Carteira Segmentada mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICACAO-03, RF-MOD-QUALIFICACAO-04, RF-MOD-QUALIFICACAO-05 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A) e abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

## [EPIC-003] — Scoring de Liquidez

> **Descrição da épica:** testes de homologação do módulo Scoring de Liquidez (MOD-SCORE): 4 funcionalidades e 1 telas.

### Pré-requisitos da Épica

- Ambiente de homologação disponível, com a massa de dados do Anexo B carregada e sem dado pessoal real.
- Usuários de teste dos perfis do Anexo A criados.
- Simulador de cargas habilitado (só existe fora de produção); os sistemas parceiros reais não são usados.

---

### [TC-111] Receber o score da UFMT: lote de score [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um lote com a versão 2.1 do modelo —, confirmar que, quando ele fecha, cada contribuinte encontrado recebe o novo score como vigente. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-SCORE-01 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um lote com a versão 2.1 do modelo.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um lote com a versão 2.1 do modelo.
4. Execute: ele fecha.
5. Volte à tela **Painel do Score de Liquidez** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ Cada contribuinte encontrado recebe o novo score como vigente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-112] Receber o score da UFMT: contribuinte inexistente [INTEGRAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um score de documento sem contribuinte na base —, confirmar que, quando o lote é processado, o registro vai para rejeitados com «Contribuinte não encontrado». |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-SCORE-01 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um score de documento sem contribuinte na base.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um score de documento sem contribuinte na base.
4. Execute: o lote é processado.
5. Volte à tela **Painel do Score de Liquidez** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O registro vai para rejeitados com «Contribuinte não encontrado».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-113] Receber o score da UFMT: lote sem versão do modelo [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um lote sem versão do modelo —, confirmar que, quando a UFMT tenta fechá-lo, o sistema recusa o fechamento e informa o campo ausente. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-SCORE-01, RN-NOVO-SCO-001 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um lote sem versão do modelo.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um lote sem versão do modelo.
4. Execute: a UFMT tenta fechá-lo.
5. Volte à tela **Painel do Score de Liquidez** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O sistema recusa o fechamento e informa o campo ausente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-114] Cumprir a regra «Fallback sem score» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o contribuinte não tem score vigente ou o score está indisponível, a qualificação e a priorização usam só os critérios determinísticos (RN-NOVO-SCO-001). |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-SCORE-01, RN-NOVO-SCO-001 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o contribuinte não tem score vigente ou o score está indisponível.
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Painel do Score de Liquidez**.
3. Localize o registro de teste em que o contribuinte não tem score vigente ou o score está indisponível.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Painel do Score de Liquidez**.

**Resultado esperado:**
- ✅ A qualificação e a priorização usam só os critérios determinísticos.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-115] Receber o score da UFMT: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-SCORE-01 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Painel do Score de Liquidez**.
3. Se a tela aparecer, tente: receber o score da ufmt.
4. Copie o endereço da tela **Painel do Score de Liquidez** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue receber o score da ufmt: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-116] Classificar o score em faixas: score na faixa [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — as faixas Baixa (0 a 0,33), Média e Alta —, confirmar que, quando chega score 0,80, ele é classificado como Alta. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-SCORE-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: as faixas Baixa (0 a 0,33), Média e Alta.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel do Score de Liquidez**.
3. Confirme que a situação de partida existe: as faixas Baixa (0 a 0,33), Média e Alta (dados do Anexo B).
4. Execute: chega score 0,80.
5. Observe o resultado na tela **Painel do Score de Liquidez**.

**Resultado esperado:**
- ✅ Ele é classificado como Alta.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-117] Classificar o score em faixas: faixas alteradas [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o admin alterou os limites das faixas —, confirmar que, quando chega o próximo lote, os novos scores usam os novos limites. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-SCORE-02, RN-NOVO-SCO-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o admin alterou os limites das faixas.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel do Score de Liquidez**.
3. Confirme que a situação de partida existe: o admin alterou os limites das faixas (dados do Anexo B).
4. Execute: chega o próximo lote.
5. Observe o resultado na tela **Painel do Score de Liquidez**.

**Resultado esperado:**
- ✅ Os novos scores usam os novos limites.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-118] Classificar o score em faixas: valor fora das faixas [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — faixas que não cobrem o valor recebido —, confirmar que, quando o score chega, fica sem faixa e o Gestor de Integração recebe alerta. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-SCORE-02, RN-NOVO-SCO-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: faixas que não cobrem o valor recebido.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel do Score de Liquidez**.
3. Confirme que a situação de partida existe: faixas que não cobrem o valor recebido (dados do Anexo B).
4. Execute: o score chega.
5. Observe o resultado na tela **Painel do Score de Liquidez**.

**Resultado esperado:**
- ✅ Fica sem faixa e o Gestor de Integração recebe alerta.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-119] Classificar o score em faixas: campo Limites da faixa inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Limites da faixa quando sobreposição e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-SCORE-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel do Score de Liquidez** e comece a ação: classificar o score em faixas.
3. Preencha o campo **Limites da faixa** de forma que fique nesta situação: sobreposição; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «As faixas não podem se sobrepor» junto do campo **Limites da faixa**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-120] Classificar o score na faixa certa, com o limite inferior incluído [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o cálculo da regra «Classificação do score em faixas» com valores conhecidos (RN-NOVO-SCO-002). |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-SCORE-02, RN-NOVO-SCO-002 |

**Pré-condições:**
- Faixas vigentes: Baixa de `0,00` até menos de `0,40`; Média de `0,40` até menos de `0,70`; Alta de `0,70` até `1,00`.
- Quatro contribuintes de teste com débito em aberto (Anexo B).

**Passos:**
1. Entre com o perfil **Gestor de Integração** (Anexo A).
2. No simulador, gere um lote de score da UFMT, versão do modelo `2.1`, com os valores `0,39`, `0,40`, `1,00` e `1,20`, um para cada contribuinte de teste.
3. Feche o lote.
4. Abra **Painel do Score de Liquidez** e confira a faixa de cada contribuinte.

**Resultado esperado:**
- ✅ `0,39` fica na faixa **Baixa**; `0,40` fica na faixa **Média** (o limite inferior pertence à faixa).
- ✅ `1,00` fica na faixa **Alta**.
- ✅ `1,20` não cabe em nenhuma faixa: o registro é recusado pelo formato (o score vai de 0 a 1) e o Gestor de Integração vê o alerta.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-121] Classificar o score em faixas: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-SCORE-02 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Painel do Score de Liquidez**.
3. Se a tela aparecer, tente: classificar o score em faixas.
4. Copie o endereço da tela **Painel do Score de Liquidez** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue classificar o score em faixas: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-122] Operar sem score: sem score [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte do ITCD sem score —, confirmar que, quando a carteira é gerada, ele é avaliado sem o limite de score. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-SCORE-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte do ITCD sem score.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: um contribuinte do ITCD sem score (dados do Anexo B).
4. Execute: a carteira é gerada.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ Ele é avaliado sem o limite de score.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-123] Operar sem score: score chega depois [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte que recebeu score hoje —, confirmar que, quando a próxima carteira é gerada, o limite de score passa a valer para ele. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-SCORE-03, RN-NOVO-SCO-001 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte que recebeu score hoje.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: um contribuinte que recebeu score hoje (dados do Anexo B).
4. Execute: a próxima carteira é gerada.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ O limite de score passa a valer para ele.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-124] Operar sem score: modelo indisponível [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a UFMT não envia lote há 30 dias —, confirmar que, quando a fila é ordenada, a prioridade usa valor e atraso e o painel do score mostra a cobertura baixa. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-SCORE-03, RN-NOVO-SCO-001 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a UFMT não envia lote há 30 dias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Prévia da Carteira Segmentada**.
3. Confirme que a situação de partida existe: a UFMT não envia lote há 30 dias (dados do Anexo B).
4. Execute: a fila é ordenada.
5. Observe o resultado na tela **Prévia da Carteira Segmentada**.

**Resultado esperado:**
- ✅ A prioridade usa valor e atraso e o painel do score mostra a cobertura baixa.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-125] Operar sem score: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-SCORE-03 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Prévia da Carteira Segmentada**.
3. Se a tela aparecer, tente: operar sem score.
4. Copie o endereço da tela **Prévia da Carteira Segmentada** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue operar sem score: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-126] Painel do Score: painel completo [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — lotes de score recebidos —, confirmar que, quando o gestor abre o painel, vê cobertura por tributo, média, distribuição e últimos lotes. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-SCORE-04 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: lotes de score recebidos.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Painel do Score de Liquidez**.
3. Confirme que a situação de partida existe: lotes de score recebidos (dados do Anexo B).
4. Execute: o gestor abre o painel.
5. Observe o resultado na tela **Painel do Score de Liquidez**.

**Resultado esperado:**
- ✅ Vê cobertura por tributo, média, distribuição e últimos lotes.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-127] Painel do Score: filtro por tributo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o painel aberto —, confirmar que, quando o gestor filtra IPVA, os indicadores mostram só o IPVA. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-SCORE-04, RN-NOVO-MON-002 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o painel aberto.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Painel do Score de Liquidez**.
3. Confirme que a situação de partida existe: o painel aberto (dados do Anexo B).
4. Execute: o gestor filtra IPVA.
5. Observe o resultado na tela **Painel do Score de Liquidez**.

**Resultado esperado:**
- ✅ Os indicadores mostram só o IPVA.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-128] Painel do Score: atendente [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um usuário atendente —, confirmar que, quando tenta abrir o painel, o sistema nega o acesso. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-SCORE-04, RN-NOVO-MON-002 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um usuário atendente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Painel do Score de Liquidez**.
3. Confirme que a situação de partida existe: um usuário atendente (dados do Anexo B).
4. Execute: tenta abrir o painel.
5. Observe o resultado na tela **Painel do Score de Liquidez**.

**Resultado esperado:**
- ✅ O sistema nega o acesso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-129] Cumprir a regra «Visibilidade por perfil» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o usuário é atendente, vê só os próprios casos, sem comparativo e sem painéis; SE é coordenador ENTÃO vê toda a carteira e os comparativos (RN-NOVO-MON-002). |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-SCORE-04, RN-NOVO-MON-002 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o usuário é atendente.
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Painel do Score de Liquidez**.
3. Localize o registro de teste em que o usuário é atendente.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Painel do Score de Liquidez**.

**Resultado esperado:**
- ✅ Vê só os próprios casos, sem comparativo e sem painéis; SE é coordenador ENTÃO vê toda a carteira e os comparativos.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-130] Painel do Score: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-SCORE-04 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Painel do Score de Liquidez**.
3. Se a tela aparecer, tente: painel do score.
4. Copie o endereço da tela **Painel do Score de Liquidez** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue painel do score: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-131] Estados da tela Painel do Score de Liquidez [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Painel do Score de Liquidez mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Gestor de Integração |
| **RN/RF relacionado** | RF-MOD-SCORE-04, RF-MOD-SCORE-01, RF-MOD-SCORE-02 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Gestor de Integração** (Anexo A) e abra **Cobrança Inteligente › Painel do Score de Liquidez**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

## [EPIC-004] — Réguas de Cobrança Massificada

> **Descrição da épica:** testes de homologação do módulo Réguas de Cobrança Massificada (MOD-REGUAS): 9 funcionalidades e 2 telas.

### Pré-requisitos da Épica

- Ambiente de homologação disponível, com a massa de dados do Anexo B carregada e sem dado pessoal real.
- Usuários de teste dos perfis do Anexo A criados.
- Simulador do provedor de mensagens ativo; opt-in de IPVA carregado para os contribuintes de teste (GAP-028 bloqueia ICMS, ITCD e parcelamentos).

---

### [TC-132] Montar a régua: régua nova [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o segmento IPVA —, confirmar que, quando o coordenador cria a régua com etapas no dia 0 por e-mail, dia 10 por SMS e dia 20 por WhatsApp, a régua fica pronta para ativar. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-01 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o segmento IPVA.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua**.
3. Confirme que a situação de partida existe: o segmento IPVA (dados do Anexo B).
4. Execute: o coordenador cria a régua com etapas no dia 0 por e-mail, dia 10 por SMS e dia 20 por WhatsApp.
5. Observe o resultado na tela **Editor de Régua**.

**Resultado esperado:**
- ✅ A régua fica pronta para ativar.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-133] Montar a régua: régua a partir de outra [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma régua de ICMS Normal —, confirmar que, quando o coordenador cria outra a partir dela, as etapas são copiadas para edição. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-01, RN-NOVO-REG-004 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma régua de ICMS Normal.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua**.
3. Confirme que a situação de partida existe: uma régua de ICMS Normal (dados do Anexo B).
4. Execute: o coordenador cria outra a partir dela.
5. Observe o resultado na tela **Editor de Régua**.

**Resultado esperado:**
- ✅ As etapas são copiadas para edição.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-134] Montar a régua: etapa duplicada [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma régua com etapa no dia 10 —, confirmar que, quando o coordenador adiciona outra no dia 10 pelo mesmo canal, o sistema recusa e mostra «Já existe etapa neste prazo e canal». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-01, RN-NOVO-REG-004 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma régua com etapa no dia 10.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua**.
3. Confirme que a situação de partida existe: uma régua com etapa no dia 10 (dados do Anexo B).
4. Execute: o coordenador adiciona outra no dia 10 pelo mesmo canal.
5. Observe o resultado na tela **Editor de Régua**.

**Resultado esperado:**
- ✅ O sistema recusa e mostra «Já existe etapa neste prazo e canal».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-135] Montar a régua: campo Nome da régua inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Nome da régua quando vazio e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-01 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua** e comece a ação: montar a régua.
3. Deixe o campo **Nome da régua** em branco; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Informe o nome da régua» junto do campo **Nome da régua**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-136] Cumprir a regra «Régua consistente» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando uma régua é salva, ela é a única ativa do segmento, não repete etapa e o modelo só usa variáveis existentes (RN-NOVO-REG-004). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-01, RN-NOVO-REG-004 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: uma régua é salva.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua**.
3. Localize o registro de teste em que uma régua é salva.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Editor de Régua**.

**Resultado esperado:**
- ✅ Ela é a única ativa do segmento, não repete etapa e o modelo só usa variáveis existentes.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-137] Montar a régua: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-REGUAS-01 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Editor de Régua**.
3. Se a tela aparecer, tente: montar a régua.
4. Copie o endereço da tela **Editor de Régua** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue montar a régua: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-138] Enviar a etapa devida: etapa do dia [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte na régua há 10 dias —, confirmar que, quando o processamento diário roda, a etapa do dia 10 é enviada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte na régua há 10 dias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: um contribuinte na régua há 10 dias (dados do Anexo B).
4. Execute: o processamento diário roda.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ A etapa do dia 10 é enviada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-139] Enviar a etapa devida: sem etapa no dia [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte na régua há 12 dias e etapas nos dias 10 e 20 —, confirmar que, quando o processamento roda, nada é enviado. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-02, RN-NOVO-ING-002, RN-NOVO-QUA-002, RN-NOVO-REG-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte na régua há 12 dias e etapas nos dias 10 e 20.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: um contribuinte na régua há 12 dias e etapas nos dias 10 e 20 (dados do Anexo B).
4. Execute: o processamento roda.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Nada é enviado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-140] Enviar a etapa devida: contribuinte regularizou [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte que regularizou ontem —, confirmar que, quando o processamento roda, nenhuma etapa é enviada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-02, RN-NOVO-ING-002, RN-NOVO-QUA-002, RN-NOVO-REG-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte que regularizou ontem.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: um contribuinte que regularizou ontem (dados do Anexo B).
4. Execute: o processamento roda.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Nenhuma etapa é enviada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-141] Cumprir a regra «Escalonamento da régua» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o prazo da próxima etapa venceu e o contribuinte não regularizou, o sistema envia a etapa seguinte; SE regularizou ENTÃO encerra a régua (RN-NOVO-REG-002). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-02, RN-NOVO-REG-002 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o prazo da próxima etapa venceu e o contribuinte não regularizou.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Localize o registro de teste em que o prazo da próxima etapa venceu e o contribuinte não regularizou.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ O sistema envia a etapa seguinte; SE regularizou ENTÃO encerra a régua.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-142] Enviar a etapa devida: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-REGUAS-02 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Execução & Status de Disparo**.
3. Se a tela aparecer, tente: enviar a etapa devida.
4. Copie o endereço da tela **Execução & Status de Disparo** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue enviar a etapa devida: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-143] Escalonar e encaminhar: régua esgotada [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte que recebeu a última etapa há 10 dias —, confirmar que, quando ele não regularizou, vira caso na cobrança qualificada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte que recebeu a última etapa há 10 dias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: um contribuinte que recebeu a última etapa há 10 dias (dados do Anexo B).
4. Execute: ele não regularizou.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Vira caso na cobrança qualificada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-144] Escalonar e encaminhar: regularizou no meio [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte na etapa 2 —, confirmar que, quando ele regulariza, a régua é encerrada e ele não vira caso. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte na etapa 2.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: um contribuinte na etapa 2 (dados do Anexo B).
4. Execute: ele regulariza.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ A régua é encerrada e ele não vira caso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-145] Escalonar e encaminhar: régua pausada [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma régua pausada —, confirmar que, quando o prazo de encaminhamento vence, ninguém é encaminhado até a régua ser retomada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma régua pausada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: uma régua pausada (dados do Anexo B).
4. Execute: o prazo de encaminhamento vence.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Ninguém é encaminhado até a régua ser retomada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-146] Escalonar e encaminhar: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-REGUAS-03 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Execução & Status de Disparo**.
3. Se a tela aparecer, tente: escalonar e encaminhar.
4. Copie o endereço da tela **Execução & Status de Disparo** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue escalonar e encaminhar: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-147] Respeitar o consentimento: com opt-in [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — opt-in vigente no WhatsApp —, confirmar que, quando a etapa de WhatsApp é devida, a mensagem é enviada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-04 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: opt-in vigente no WhatsApp.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: opt-in vigente no WhatsApp (dados do Anexo B).
4. Execute: a etapa de WhatsApp é devida.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ A mensagem é enviada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-148] Respeitar o consentimento: opt-out no dia [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o contribuinte fez opt-out hoje de manhã —, confirmar que, quando a etapa é processada à tarde, a mensagem não é enviada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-04, RN-NOVO-REG-003 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o contribuinte fez opt-out hoje de manhã.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: o contribuinte fez opt-out hoje de manhã (dados do Anexo B).
4. Execute: a etapa é processada à tarde.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ A mensagem não é enviada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-149] Respeitar o consentimento: sem opt-in [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — nenhum consentimento registrado para SMS —, confirmar que, quando a etapa de SMS é devida, a comunicação fica como «Não enviada — sem consentimento». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-04, RN-NOVO-REG-003 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: nenhum consentimento registrado para SMS.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: nenhum consentimento registrado para SMS (dados do Anexo B).
4. Execute: a etapa de SMS é devida.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ A comunicação fica como «Não enviada — sem consentimento».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-150] Cumprir a regra «Consentimento por canal» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o contribuinte não tem opt-in vigente no canal, o sistema não envia por esse canal; o opt-out vale na hora (RN-NOVO-REG-003). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-04, RN-NOVO-REG-003 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o contribuinte não tem opt-in vigente no canal.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Localize o registro de teste em que o contribuinte não tem opt-in vigente no canal.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ O sistema não envia por esse canal; o opt-out vale na hora.
- ✅ Enquanto o GAP-028 estiver aberto, nenhuma comunicação de ICMS, ITCD ou parcelamento sai: só o IPVA, que tem fonte de opt-in.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-151] Respeitar o consentimento: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-REGUAS-04 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Execução & Status de Disparo**.
3. Se a tela aparecer, tente: respeitar o consentimento.
4. Copie o endereço da tela **Execução & Status de Disparo** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue respeitar o consentimento: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-152] Enviar por canal: envio por e-mail [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma comunicação de e-mail liberada —, confirmar que, quando o envio roda, o provedor recebe a mensagem e ela fica «Enviada». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-05 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma comunicação de e-mail liberada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: uma comunicação de e-mail liberada (dados do Anexo B).
4. Execute: o envio roda.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ O provedor recebe a mensagem e ela fica «Enviada».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-153] Enviar por canal: troca de provedor [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o provedor de SMS foi trocado em parâmetro —, confirmar que, quando a próxima comunicação de SMS é enviada, ela usa o novo provedor. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-05, RN-NOVO-REG-003 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o provedor de SMS foi trocado em parâmetro.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: o provedor de SMS foi trocado em parâmetro (dados do Anexo B).
4. Execute: a próxima comunicação de SMS é enviada.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Ela usa o novo provedor.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-154] Enviar por canal: variável ausente [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um modelo que usa uma variável sem valor para o contribuinte —, confirmar que, quando a comunicação é montada, ela fica «Falha — dado ausente» e não é enviada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-05, RN-NOVO-REG-003 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um modelo que usa uma variável sem valor para o contribuinte.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: um modelo que usa uma variável sem valor para o contribuinte (dados do Anexo B).
4. Execute: a comunicação é montada.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Ela fica «Falha — dado ausente» e não é enviada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-155] Enviar por canal: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-REGUAS-05 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Execução & Status de Disparo**.
3. Se a tela aparecer, tente: enviar por canal.
4. Copie o endereço da tela **Execução & Status de Disparo** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue enviar por canal: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-156] Receber o status de entrega: entregue [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma comunicação «Enviada» —, confirmar que, quando o provedor informa entrega, ela fica «Entregue». |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-REGUAS-06 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma comunicação «Enviada».

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: uma comunicação «Enviada».
4. Execute: o provedor informa entrega.
5. Volte à tela **Execução & Status de Disparo** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ Ela fica «Entregue».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-157] Receber o status de entrega: status repetido [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma comunicação «Entregue» —, confirmar que, quando o mesmo status chega de novo, nada muda. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-REGUAS-06 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma comunicação «Entregue».

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: uma comunicação «Entregue».
4. Execute: o mesmo status chega de novo.
5. Volte à tela **Execução & Status de Disparo** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ Nada muda.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-158] Receber o status de entrega: status de comunicação inexistente [INTEGRAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um identificador desconhecido —, confirmar que, quando o provedor envia o status, o sistema recusa e registra o evento. |
| **Perfil do testador** | Gestor de Integração, usando o simulador de cargas |
| **RN/RF relacionado** | RF-MOD-REGUAS-06 |

**Pré-condições:**
- Usuário de teste do perfil Gestor de Integração disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um identificador desconhecido.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Gestor de Integração** (Anexo A).
2. Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).
3. Monte a situação no simulador: um identificador desconhecido.
4. Execute: o provedor envia o status.
5. Volte à tela **Execução & Status de Disparo** e localize o lote ou o registro do teste.

**Resultado esperado:**
- ✅ O sistema recusa e registra o evento.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-159] Receber o status de entrega: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-REGUAS-06 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Execução & Status de Disparo**.
3. Se a tela aparecer, tente: receber o status de entrega.
4. Copie o endereço da tela **Execução & Status de Disparo** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue receber o status de entrega: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-160] Reenviar falhas: reenvio com sucesso [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma comunicação em Falha e limite de 3 tentativas —, confirmar que, quando o reenvio roda, ela é reenviada e fica «Enviada». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-07 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma comunicação em Falha e limite de 3 tentativas.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: uma comunicação em Falha e limite de 3 tentativas (dados do Anexo B).
4. Execute: o reenvio roda.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Ela é reenviada e fica «Enviada».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-161] Reenviar falhas: limite alterado [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o admin mudou o limite para 5 —, confirmar que, quando a próxima falha ocorre, valem 5 tentativas. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-07, RN-NOVO-REG-001 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o admin mudou o limite para 5.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: o admin mudou o limite para 5 (dados do Anexo B).
4. Execute: a próxima falha ocorre.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Valem 5 tentativas.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-162] Reenviar falhas: limite atingido [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma comunicação que falhou 3 vezes com limite 3 —, confirmar que, quando o reenvio roda, ela fica «Falha definitiva» e não é reenviada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-07, RN-NOVO-REG-001 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma comunicação que falhou 3 vezes com limite 3.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: uma comunicação que falhou 3 vezes com limite 3 (dados do Anexo B).
4. Execute: o reenvio roda.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Ela fica «Falha definitiva» e não é reenviada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-163] Cumprir a regra «Reenvio limitado» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando a comunicação falha, o sistema tenta de novo até o limite de tentativas do parâmetro (RN-NOVO-REG-001). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-07, RN-NOVO-REG-001 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: a comunicação falha.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Localize o registro de teste em que a comunicação falha.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ O sistema tenta de novo até o limite de tentativas do parâmetro.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-164] Reenviar falhas: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-REGUAS-07 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Execução & Status de Disparo**.
3. Se a tela aparecer, tente: reenviar falhas.
4. Copie o endereço da tela **Execução & Status de Disparo** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue reenviar falhas: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-165] Pausar e retomar a régua: pausa [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma régua ativa —, confirmar que, quando o coordenador pausa, nenhuma comunicação nova é criada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-08 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma régua ativa.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua**.
3. Confirme que a situação de partida existe: uma régua ativa (dados do Anexo B).
4. Execute: o coordenador pausa.
5. Observe o resultado na tela **Editor de Régua**.

**Resultado esperado:**
- ✅ Nenhuma comunicação nova é criada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-166] Pausar e retomar a régua: retomada [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma régua pausada há 5 dias —, confirmar que, quando o coordenador retoma, o processamento seguinte envia as etapas devidas a partir de hoje. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-08 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma régua pausada há 5 dias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua**.
3. Confirme que a situação de partida existe: uma régua pausada há 5 dias (dados do Anexo B).
4. Execute: o coordenador retoma.
5. Observe o resultado na tela **Editor de Régua**.

**Resultado esperado:**
- ✅ O processamento seguinte envia as etapas devidas a partir de hoje.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-167] Pausar e retomar a régua: pausa com envios no dia [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — comunicações já enviadas hoje —, confirmar que, quando a régua é pausada, elas continuam registradas e não são canceladas. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-08 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: comunicações já enviadas hoje.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua**.
3. Confirme que a situação de partida existe: comunicações já enviadas hoje (dados do Anexo B).
4. Execute: a régua é pausada.
5. Observe o resultado na tela **Editor de Régua**.

**Resultado esperado:**
- ✅ Elas continuam registradas e não são canceladas.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-168] Pausar e retomar a régua: campo Estado inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Estado quando vazio e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-08 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua** e comece a ação: pausar e retomar a régua.
3. Deixe o campo **Estado** em branco; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Preencha este campo» junto do campo **Estado**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-169] Cumprir a regra «Pausa não cancela o enviado» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando a régua é pausada, o sistema para de criar comunicações e mantém as já enviadas (RN-NOVO-REG-005). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-08, RN-NOVO-REG-005 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: a régua é pausada.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Editor de Régua**.
3. Localize o registro de teste em que a régua é pausada.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Editor de Régua**.

**Resultado esperado:**
- ✅ O sistema para de criar comunicações e mantém as já enviadas.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-170] Pausar e retomar a régua: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-REGUAS-08 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Editor de Régua**.
3. Se a tela aparecer, tente: pausar e retomar a régua.
4. Copie o endereço da tela **Editor de Régua** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue pausar e retomar a régua: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-171] Acompanhar a execução: lista do dia [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — as comunicações enviadas hoje —, confirmar que, quando o coordenador abre a execução, vê as comunicações por régua, canal e situação. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-09 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: as comunicações enviadas hoje.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: as comunicações enviadas hoje (dados do Anexo B).
4. Execute: o coordenador abre a execução.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Vê as comunicações por régua, canal e situação.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-172] Acompanhar a execução: filtro por falha [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — comunicações enviadas, entregues e em falha definitiva —, confirmar que, quando o coordenador filtra «Falha definitiva», vê só essas. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-09 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: comunicações enviadas, entregues e em falha definitiva.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: comunicações enviadas, entregues e em falha definitiva (dados do Anexo B).
4. Execute: o coordenador filtra «Falha definitiva».
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Vê só essas.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-173] Acompanhar a execução: sem comunicações [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma régua ainda não iniciada —, confirmar que, quando o coordenador a filtra, vê «Nenhuma comunicação para esta régua». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-09 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma régua ainda não iniciada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo**.
3. Confirme que a situação de partida existe: uma régua ainda não iniciada (dados do Anexo B).
4. Execute: o coordenador a filtra.
5. Observe o resultado na tela **Execução & Status de Disparo**.

**Resultado esperado:**
- ✅ Vê «Nenhuma comunicação para esta régua».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-174] Acompanhar a execução: campo Data de envio inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Data de envio quando intervalo acima de 31 dias e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-09 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Execução & Status de Disparo** e comece a ação: acompanhar a execução.
3. Preencha o campo **Data de envio** de forma que fique nesta situação: intervalo acima de 31 dias; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Escolha no máximo 31 dias» junto do campo **Data de envio**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-175] Acompanhar a execução: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-REGUAS-09 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Execução & Status de Disparo**.
3. Se a tela aparecer, tente: acompanhar a execução.
4. Copie o endereço da tela **Execução & Status de Disparo** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue acompanhar a execução: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-176] Estados da tela Editor de Régua [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Editor de Régua mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-01, RF-MOD-REGUAS-08 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A) e abra **Cobrança Inteligente › Editor de Régua**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-177] Estados da tela Execução & Status de Disparo [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Execução & Status de Disparo mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-REGUAS-09, RF-MOD-REGUAS-02, RF-MOD-REGUAS-04 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A) e abra **Cobrança Inteligente › Execução & Status de Disparo**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

## [EPIC-005] — Cobrança Qualificada

> **Descrição da épica:** testes de homologação do módulo Cobrança Qualificada (MOD-QUALIFICADA): 7 funcionalidades e 2 telas.

### Pré-requisitos da Épica

- Ambiente de homologação disponível, com a massa de dados do Anexo B carregada e sem dado pessoal real.
- Usuários de teste dos perfis do Anexo A criados.

---

### [TC-178] Criar casos: carteira confirmada [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — 120 contribuintes na qualificada —, confirmar que, quando a carteira é confirmada, nascem 120 casos numerados. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-01 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: 120 contribuintes na qualificada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: 120 contribuintes na qualificada (dados do Anexo B).
4. Execute: a carteira é confirmada.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ Nascem 120 casos numerados.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-179] Criar casos: régua esgotada [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte da massificada que esgotou a régua —, confirmar que, quando o encaminhamento roda, nasce um caso para ele. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-01, RN-NOVO-ING-002, RN-NOVO-QUA-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte da massificada que esgotou a régua.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: um contribuinte da massificada que esgotou a régua (dados do Anexo B).
4. Execute: o encaminhamento roda.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ Nasce um caso para ele.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-180] Criar casos: caso já aberto [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte com caso aberto —, confirmar que, quando ele seria encaminhado de novo, o sistema não cria outro caso. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-01, RN-NOVO-ING-002, RN-NOVO-QUA-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte com caso aberto.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: um contribuinte com caso aberto (dados do Anexo B).
4. Execute: ele seria encaminhado de novo.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ O sistema não cria outro caso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-181] Criar casos: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Administrador não executa esta funcionalidade, porque o Administrador não tem acesso operacional a casos. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-01 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Administrador** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Minha Fila**.
3. Se a tela aparecer, tente: criar casos.
4. Copie o endereço da tela **Minha Fila** aberto pelo perfil autorizado, cole no navegador do perfil Administrador e tente de novo.

**Resultado esperado:**
- ✅ O perfil Administrador não consegue criar casos: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-182] Distribuir casos: distribuição por carga [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — atendentes com 10, 12 e 8 casos abertos —, confirmar que, quando um caso é criado, ele vai para quem tem 8. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: atendentes com 10, 12 e 8 casos abertos.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: atendentes com 10, 12 e 8 casos abertos (dados do Anexo B).
4. Execute: um caso é criado.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ Ele vai para quem tem 8.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-183] Distribuir casos: distribuição por grupo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um grupo de atendentes configurado para ITCD —, confirmar que, quando um caso de ITCD é criado, ele vai para alguém desse grupo. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-02, RN-NOVO-CQ-001 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um grupo de atendentes configurado para ITCD.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: um grupo de atendentes configurado para ITCD (dados do Anexo B).
4. Execute: um caso de ITCD é criado.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ Ele vai para alguém desse grupo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-184] Distribuir casos: grupo sem atendente ativo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um grupo sem ninguém ativo —, confirmar que, quando um caso é criado, ele fica sem atendente e o coordenador recebe alerta. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-02, RN-NOVO-CQ-001 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um grupo sem ninguém ativo.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: um grupo sem ninguém ativo (dados do Anexo B).
4. Execute: um caso é criado.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ Ele fica sem atendente e o coordenador recebe alerta.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-185] Atribuir o caso novo ao atendente com menos casos; no empate, ao que recebeu há mais tempo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o cálculo da regra «Distribuição automática» com valores conhecidos (RN-NOVO-CQ-001). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-02, RN-NOVO-CQ-001 |

**Pré-condições:**
- Grupo de atendentes `Grupo ICMS Teste` com três atendentes de teste (Anexo A): Atendente A1 com `5` casos abertos; A2 com `3` casos, último recebido em `11/11/2026 09:00`; A3 com `3` casos, último recebido em `12/11/2026 10:00`.
- Carteira de teste pronta para criar 1 caso de ICMS (Anexo B).

**Passos:**
1. Entre com o perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Prévia da Carteira Segmentada** e confirme a carteira que cria o caso de teste.
3. Abra o caso criado em **Dossiê & Caso**.
4. Confira o atendente responsável e o histórico do caso.

**Resultado esperado:**
- ✅ O caso é atribuído à Atendente **A2**: A2 e A3 têm 3 casos (menos que os 5 de A1) e A2 recebeu caso há mais tempo.
- ✅ O histórico do caso registra a atribuição automática com data e hora.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-186] Distribuir casos: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Administrador não executa esta funcionalidade, porque o Administrador não tem acesso operacional a casos. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-02 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Administrador** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Minha Fila**.
3. Se a tela aparecer, tente: distribuir casos.
4. Copie o endereço da tela **Minha Fila** aberto pelo perfil autorizado, cole no navegador do perfil Administrador e tente de novo.

**Resultado esperado:**
- ✅ O perfil Administrador não consegue distribuir casos: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-187] Fila priorizada: minha fila [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — 15 casos atribuídos ao atendente —, confirmar que, quando ele abre «Minha fila», vê os 15 do maior para o menor em prioridade. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-03 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: 15 casos atribuídos ao atendente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: 15 casos atribuídos ao atendente (dados do Anexo B).
4. Execute: ele abre «Minha fila».
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ Vê os 15 do maior para o menor em prioridade.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-188] Fila priorizada: caso sem score [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um caso de contribuinte sem score —, confirmar que, quando a fila é ordenada, a prioridade dele usa valor e atraso. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-03, RN-NOVO-MON-002, RN-NOVO-SCO-001, RN-NOVO-CQ-003 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um caso de contribuinte sem score.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: um caso de contribuinte sem score (dados do Anexo B).
4. Execute: a fila é ordenada.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ A prioridade dele usa valor e atraso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-189] Fila priorizada: caso de outro atendente [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um caso atribuído a outro atendente —, confirmar que, quando o atendente procura por ele, o caso não aparece. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-03 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um caso atribuído a outro atendente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: um caso atribuído a outro atendente (dados do Anexo B).
4. Execute: o atendente procura por ele.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ O caso não aparece.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-190] Ordenar a fila do atendente pela prioridade calculada com score, valor e atraso [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o cálculo da regra «Prioridade da fila» com valores conhecidos (RN-NOVO-CQ-003). |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-03, RN-NOVO-CQ-003 |

**Pré-condições:**
- Carteira do ciclo em que o menor valor em aberto é `R$ 1.000,00`, o maior é `R$ 11.000,00`, o menor atraso é `0` dias e o maior é `200` dias (Anexo B).
- Atendente A1 com dois casos: X — valor `R$ 6.000,00`, atraso `150` dias, score `0,80`; Y — valor `R$ 11.000,00`, atraso `50` dias, sem score.

**Passos:**
1. Entre com o perfil **Atendente** como A1 (Anexo A).
2. Abra **Minha Fila**.
3. Ordene pela coluna **Prioridade**, da maior para a menor.
4. Anote a prioridade mostrada nos casos X e Y.

**Resultado esperado:**
- ✅ Caso X: valor normalizado `0,50` ((6.000 − 1.000) ÷ 10.000), atraso normalizado `0,75` (150 ÷ 200); prioridade = (0,80 + 0,50 + 0,75) ÷ 3 = `0,68`.
- ✅ Caso Y, sem score: valor `1,00`, atraso `0,25`; prioridade = (1,00 + 0,25) ÷ 2 = `0,63` (0,625 arredondado).
- ✅ X aparece antes de Y na fila.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-191] Dossiê do caso: dossiê completo [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um caso de contribuinte com débitos, parcelamento e sinalização —, confirmar que, quando o atendente abre o caso, vê tudo em listas no mesmo formulário. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-04 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um caso de contribuinte com débitos, parcelamento e sinalização.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: um caso de contribuinte com débitos, parcelamento e sinalização (dados do Anexo B).
4. Execute: o atendente abre o caso.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ Vê tudo em listas no mesmo formulário.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-192] Dossiê do caso: grupo econômico [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte com duas empresas vinculadas —, confirmar que, quando o caso é aberto, os vínculos aparecem com a natureza da relação. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-04, RN-NOVO-ING-007, RN-NOVO-GOV-002 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte com duas empresas vinculadas.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: um contribuinte com duas empresas vinculadas (dados do Anexo B).
4. Execute: o caso é aberto.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ Os vínculos aparecem com a natureza da relação.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-193] Dossiê do caso: cPF de pessoa física [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um caso de pessoa física —, confirmar que, quando o atendente abre o caso, o CPF aparece mascarado. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-04, RN-NOVO-ING-007, RN-NOVO-GOV-002 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um caso de pessoa física.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: um caso de pessoa física (dados do Anexo B).
4. Execute: o atendente abre o caso.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ O CPF aparece mascarado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-194] Cumprir a regra «CPF mascarado e exportação registrada» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando o contribuinte é pessoa física, o CPF aparece mascarado por padrão; SE alguém exporta dados ENTÃO só papéis autorizados conseguem e a exportação fica registrada (RN-NOVO-GOV-002). |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-04, RN-NOVO-GOV-002 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: o contribuinte é pessoa física.
- Usuário de teste do perfil Atendente disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Localize o registro de teste em que o contribuinte é pessoa física.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ O CPF aparece mascarado por padrão; SE alguém exporta dados ENTÃO só papéis autorizados conseguem e a exportação fica registrada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-195] Dossiê do caso: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Administrador não executa esta funcionalidade, porque o Administrador não tem acesso operacional a casos. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-04 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Administrador** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Dossiê & Caso**.
3. Se a tela aparecer, tente: dossiê do caso.
4. Copie o endereço da tela **Dossiê & Caso** aberto pelo perfil autorizado, cole no navegador do perfil Administrador e tente de novo.

**Resultado esperado:**
- ✅ O perfil Administrador não consegue dossiê do caso: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-196] Registrar interação: interação registrada [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um caso aberto —, confirmar que, quando o atendente registra contato telefônico com resultado «Promessa de pagamento», a interação aparece no histórico com autor e data. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-05 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um caso aberto.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: um caso aberto (dados do Anexo B).
4. Execute: o atendente registra contato telefônico com resultado «Promessa de pagamento».
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ A interação aparece no histórico com autor e data.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-197] Registrar interação: correção de interação [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma interação com erro —, confirmar que, quando o atendente precisa corrigir, ele registra nova interação de correção, e a anterior continua. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-05, RN-NOVO-CQ-002 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma interação com erro.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: uma interação com erro (dados do Anexo B).
4. Execute: o atendente precisa corrigir.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ Ele registra nova interação de correção, e a anterior continua.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-198] Registrar interação: tentativa de editar [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — uma interação salva —, confirmar que, quando alguém tenta editar ou excluir, o sistema recusa. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-05, RN-NOVO-CQ-002 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: uma interação salva.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: uma interação salva (dados do Anexo B).
4. Execute: alguém tenta editar ou excluir.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ O sistema recusa.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-199] Registrar interação: campo Tipo de contato inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Tipo de contato quando vazio e explica o que corrigir. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-05 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso** e comece a ação: registrar interação.
3. Deixe o campo **Tipo de contato** em branco; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Escolha o tipo de contato» junto do campo **Tipo de contato**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-200] Registrar interação: limites do campo Descrição [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o comportamento nos limites do campo Descrição (até 2000 caracteres). |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-05 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso** e comece a ação: registrar interação.
3. Preencha o campo **Descrição**, um de cada vez, com um texto com exatamente `2000` caracteres e outro com `2001` caracteres, e clique em **Salvar** a cada tentativa.

**Resultado esperado:**
- ✅ O texto com 2000 caracteres é aceito inteiro.
- ✅ O campo não deixa passar do caractere 2000: o 2001º não entra ou a tela avisa o limite.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-201] Cumprir a regra «Ações auditáveis e imutáveis» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando uma interação, disparo, distribuição, alteração de régua ou encerramento de caso é registrado, o registro guarda autor e data e não pode ser alterado nem excluído (RN-NOVO-CQ-002). |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-05, RN-NOVO-CQ-002 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: uma interação, disparo, distribuição, alteração de régua ou encerramento de caso é registrado.
- Usuário de teste do perfil Atendente disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Localize o registro de teste em que uma interação, disparo, distribuição, alteração de régua ou encerramento de caso é registrado.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ O registro guarda autor e data e não pode ser alterado nem excluído.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-202] Registrar interação: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Administrador não executa esta funcionalidade, porque o Administrador não tem acesso operacional a casos. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-05 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Administrador** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Dossiê & Caso**.
3. Se a tela aparecer, tente: registrar interação.
4. Copie o endereço da tela **Dossiê & Caso** aberto pelo perfil autorizado, cole no navegador do perfil Administrador e tente de novo.

**Resultado esperado:**
- ✅ O perfil Administrador não consegue registrar interação: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-203] Follow-up com lembrete: lembrete no dia [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um follow-up para hoje —, confirmar que, quando o dia começa, o atendente recebe a notificação. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-06 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um follow-up para hoje.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: um follow-up para hoje (dados do Anexo B).
4. Execute: o dia começa.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ O atendente recebe a notificação.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-204] Follow-up com lembrete: follow-up reagendado [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um follow-up para amanhã —, confirmar que, quando o atendente muda para a próxima semana, a notificação acontece na nova data. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-06 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um follow-up para amanhã.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: um follow-up para amanhã (dados do Anexo B).
4. Execute: o atendente muda para a próxima semana.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ A notificação acontece na nova data.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-205] Follow-up com lembrete: data no passado [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um caso —, confirmar que, quando o atendente agenda follow-up para ontem, o sistema recusa e mostra «A data do follow-up deve ser hoje ou futura». |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-06 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um caso.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: um caso (dados do Anexo B).
4. Execute: o atendente agenda follow-up para ontem.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ O sistema recusa e mostra «A data do follow-up deve ser hoje ou futura».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-206] Follow-up com lembrete: campo Data do follow-up inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Data do follow-up quando passado e explica o que corrigir. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-06 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso** e comece a ação: follow-up com lembrete.
3. Preencha o campo **Data do follow-up** de forma que fique nesta situação: passado; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «A data do follow-up deve ser hoje ou futura» junto do campo **Data do follow-up**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-207] Follow-up com lembrete: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Administrador não executa esta funcionalidade, porque o Administrador não tem acesso operacional a casos. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-06 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Administrador** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Dossiê & Caso**.
3. Se a tela aparecer, tente: follow-up com lembrete.
4. Copie o endereço da tela **Dossiê & Caso** aberto pelo perfil autorizado, cole no navegador do perfil Administrador e tente de novo.

**Resultado esperado:**
- ✅ O perfil Administrador não consegue follow-up com lembrete: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-208] Reatribuir casos: reatribuição [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um caso do atendente A —, confirmar que, quando o coordenador o transfere para B, ele sai da fila de A e entra na de B. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-07 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um caso do atendente A.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: um caso do atendente A (dados do Anexo B).
4. Execute: o coordenador o transfere para B.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ Ele sai da fila de A e entra na de B.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-209] Reatribuir casos: reatribuição em lote [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — 20 casos de um atendente em férias —, confirmar que, quando o coordenador os transfere de uma vez, os 20 mudam e cada mudança é registrada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-07 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: 20 casos de um atendente em férias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: 20 casos de um atendente em férias (dados do Anexo B).
4. Execute: o coordenador os transfere de uma vez.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ Os 20 mudam e cada mudança é registrada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-210] Reatribuir casos: atendente comum tenta reatribuir [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um atendente —, confirmar que, quando tenta transferir um caso, o sistema recusa. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-07, RN-NOVO-CQ-001, RN-NOVO-CQ-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um atendente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso**.
3. Confirme que a situação de partida existe: um atendente (dados do Anexo B).
4. Execute: tenta transferir um caso.
5. Observe o resultado na tela **Dossiê & Caso**.

**Resultado esperado:**
- ✅ O sistema recusa.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-211] Reatribuir casos: campo Atendente inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Atendente quando vazio e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-07 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Dossiê & Caso** e comece a ação: reatribuir casos.
3. Deixe o campo **Atendente** em branco; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Preencha este campo» junto do campo **Atendente**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-212] Reatribuir casos: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Administrador não executa esta funcionalidade, porque o Administrador não tem acesso operacional a casos. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-07 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Administrador** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Dossiê & Caso**.
3. Se a tela aparecer, tente: reatribuir casos.
4. Copie o endereço da tela **Dossiê & Caso** aberto pelo perfil autorizado, cole no navegador do perfil Administrador e tente de novo.

**Resultado esperado:**
- ✅ O perfil Administrador não consegue reatribuir casos: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-213] Estados da tela Minha Fila [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Minha Fila mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-03, RF-MOD-QUALIFICADA-01, RF-MOD-QUALIFICADA-02 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A) e abra **Cobrança Inteligente › Minha Fila**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-214] Estados da tela Dossiê & Caso [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Dossiê & Caso mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-QUALIFICADA-04, RF-MOD-QUALIFICADA-05, RF-MOD-QUALIFICADA-06 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A) e abra **Cobrança Inteligente › Dossiê & Caso**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

## [EPIC-006] — Monitoramento e KPIs

> **Descrição da épica:** testes de homologação do módulo Monitoramento e KPIs (MOD-MONITORAMENTO): 8 funcionalidades e 2 telas.

### Pré-requisitos da Épica

- Ambiente de homologação disponível, com a massa de dados do Anexo B carregada e sem dado pessoal real.
- Usuários de teste dos perfis do Anexo A criados.

---

### [TC-215] Marcar notificado e regularizado: notificado por comunicação [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um item da massificada —, confirmar que, quando a primeira comunicação é enviada, o item fica notificado. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-01 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um item da massificada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Confirme que a situação de partida existe: um item da massificada (dados do Anexo B).
4. Execute: a primeira comunicação é enviada.
5. Observe o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ O item fica notificado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-216] Marcar notificado e regularizado: notificado por interação [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um item da qualificada —, confirmar que, quando o atendente registra o primeiro contato, o item fica notificado. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-01, RN-NOVO-MON-004 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um item da qualificada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Confirme que a situação de partida existe: um item da qualificada (dados do Anexo B).
4. Execute: o atendente registra o primeiro contato.
5. Observe o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ O item fica notificado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-217] Marcar notificado e regularizado: item do grupo de controle [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um item de controle —, confirmar que, quando o ciclo corre, ele nunca fica notificado. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-01, RN-NOVO-MON-004 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um item de controle.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Confirme que a situação de partida existe: um item de controle (dados do Anexo B).
4. Execute: o ciclo corre.
5. Observe o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ Ele nunca fica notificado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-218] Cumprir a regra «Indicadores direto das tabelas» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando um indicador é calculado, ele usa os dados das tabelas da aplicação, e a coleta diária forma o histórico (RN-NOVO-MON-004). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-01, RN-NOVO-MON-004 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: um indicador é calculado.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Localize o registro de teste em que um indicador é calculado.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ Ele usa os dados das tabelas da aplicação, e a coleta diária forma o histórico.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-219] Marcar notificado e regularizado: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-01 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Regularizações & Origem**.
3. Se a tela aparecer, tente: marcar notificado e regularizado.
4. Copie o endereço da tela **Regularizações & Origem** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue marcar notificado e regularizado: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-220] Atribuir a origem da regularização: resposta à cobrança [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um SMS entregue há 12 dias —, confirmar que, quando o débito é regularizado, a origem é «Resposta à cobrança», canal SMS. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um SMS entregue há 12 dias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Confirme que a situação de partida existe: um SMS entregue há 12 dias (dados do Anexo B).
4. Execute: o débito é regularizado.
5. Observe o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ A origem é «Resposta à cobrança», canal SMS.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-221] Atribuir a origem da regularização: espontânea [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — nenhum contato nos últimos 30 dias —, confirmar que, quando o débito é regularizado, a origem é «Espontânea». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-02, RN-NOVO-MON-001, RN-NOVO-MON-003 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: nenhum contato nos últimos 30 dias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Confirme que a situação de partida existe: nenhum contato nos últimos 30 dias (dados do Anexo B).
4. Execute: o débito é regularizado.
5. Observe o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ A origem é «Espontânea».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-222] Atribuir a origem da regularização: grupo de controle [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um item do grupo de controle —, confirmar que, quando ele regulariza, a origem é sempre «Espontânea». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um item do grupo de controle.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Confirme que a situação de partida existe: um item do grupo de controle (dados do Anexo B).
4. Execute: ele regulariza.
5. Observe o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ A origem é sempre «Espontânea».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-223] Cumprir a regra «Origem da regularização» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando uma regularização é registrada, ela recebe uma origem: espontânea ou resposta à cobrança, com canal e instrumento (RN-NOVO-MON-001). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-02, RN-NOVO-MON-001 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: uma regularização é registrada.
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Localize o registro de teste em que uma regularização é registrada.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ Ela recebe uma origem: espontânea ou resposta à cobrança, com canal e instrumento.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-224] Calcular a origem da regularização pela janela de 30 dias [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o cálculo da regra «Atribuição da origem» com valores conhecidos (RN-NOVO-MON-003). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-02, RN-NOVO-MON-003 |

**Pré-condições:**
- Janela de atribuição em `30` dias (padrão).
- Três débitos de teste regularizados em `10/11/2026` (Anexo B): débito 1 com SMS entregue em `25/10/2026` e e-mail entregue em `05/11/2026`; débito 2 com único contato (SMS entregue) em `20/09/2026`; débito 3 de um item do grupo de controle.

**Passos:**
1. Entre com o perfil **Coordenador de Cobrança** (Anexo A).
2. Peça ao Gestor de Integração para carregar, pelo simulador, a regularização dos três débitos em `10/11/2026`.
3. Abra **Regularizações & Origem** e filtre pela data `10/11/2026`.
4. Confira a origem e o canal de cada regularização.

**Resultado esperado:**
- ✅ Débito 1: origem **Resposta à cobrança**, canal **E-mail** (o contato mais recente dentro dos 30 dias); o e-mail fica marcado como pago em até 30 dias.
- ✅ Débito 2: origem **Espontânea** (o SMS foi 51 dias antes, fora da janela).
- ✅ Débito 3: origem **Espontânea** (item do grupo de controle).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-225] Atribuir a origem da regularização: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-02 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Regularizações & Origem**.
3. Se a tela aparecer, tente: atribuir a origem da regularização.
4. Copie o endereço da tela **Regularizações & Origem** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue atribuir a origem da regularização: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-226] Indicadores de funil: funil do ciclo [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a carteira de junho —, confirmar que, quando o coordenador abre o painel, vê identificados, notificados, regularizados e crédito recuperado. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a carteira de junho.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: a carteira de junho (dados do Anexo B).
4. Execute: o coordenador abre o painel.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ Vê identificados, notificados, regularizados e crédito recuperado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-227] Indicadores de funil: recorte por tributo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o painel —, confirmar que, quando o coordenador filtra ITCD, o funil mostra só ITCD. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-03, RN-NOVO-MON-004 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o painel.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: o painel (dados do Anexo B).
4. Execute: o coordenador filtra ITCD.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ O funil mostra só ITCD.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-228] Indicadores de funil: ciclo sem carteira [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um ciclo sem carteira confirmada —, confirmar que, quando o painel é aberto, o funil mostra só os identificados e o aviso «Sem carteira confirmada no ciclo». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um ciclo sem carteira confirmada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: um ciclo sem carteira confirmada (dados do Anexo B).
4. Execute: o painel é aberto.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ O funil mostra só os identificados e o aviso «Sem carteira confirmada no ciclo».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-229] Indicadores de funil: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-03 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Painel Institucional de Cobrança**.
3. Se a tela aparecer, tente: indicadores de funil.
4. Copie o endereço da tela **Painel Institucional de Cobrança** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue indicadores de funil: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-230] Efeito incremental: efeito positivo [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — taxa cobrada de 30,8% e de controle de 21,4% —, confirmar que, quando o painel calcula, mostra efeito incremental de +9,4 p.p.. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-04 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: taxa cobrada de 30,8% e de controle de 21,4%.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: taxa cobrada de 30,8% e de controle de 21,4% (dados do Anexo B).
4. Execute: o painel calcula.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ Mostra efeito incremental de +9,4 p.p.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-231] Efeito incremental: por tributo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o painel —, confirmar que, quando o coordenador filtra IPVA, o efeito é calculado só com itens de IPVA. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-04, RN-NOVO-QUA-003, RN-NOVO-MON-003, RN-NOVO-MON-005 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o painel.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: o painel (dados do Anexo B).
4. Execute: o coordenador filtra IPVA.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ O efeito é calculado só com itens de IPVA.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-232] Efeito incremental: controle vazio [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um ciclo sem grupo de controle —, confirmar que, quando o painel calcula, o efeito aparece como «Indisponível — sem grupo de controle». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-04, RN-NOVO-QUA-003, RN-NOVO-MON-003, RN-NOVO-MON-005 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um ciclo sem grupo de controle.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: um ciclo sem grupo de controle (dados do Anexo B).
4. Execute: o painel calcula.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ O efeito aparece como «Indisponível — sem grupo de controle».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-233] Calcular o efeito incremental contra o grupo de controle [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar o cálculo da regra «Efeito incremental» com valores conhecidos (RN-NOVO-MON-005). |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-04, RN-NOVO-MON-005 |

**Pré-condições:**
- Ciclo de teste com carteira confirmada (Anexo B): `970` itens notificados fora do controle, dos quais `194` regularizados; `30` itens no grupo de controle, dos quais `3` regularizados.

**Passos:**
1. Entre com o perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Painel Institucional de Cobrança**.
3. Selecione o ciclo de teste no filtro de período.
4. Leia o indicador **Efeito incremental**.

**Resultado esperado:**
- ✅ Taxa da carteira cobrada = 194 ÷ 970 = `20,0%`; taxa do controle = 3 ÷ 30 = `10,0%`.
- ✅ O painel mostra efeito incremental de `10,0` pontos percentuais.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-234] Efeito incremental: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-04 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Painel Institucional de Cobrança**.
3. Se a tela aparecer, tente: efeito incremental.
4. Copie o endereço da tela **Painel Institucional de Cobrança** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue efeito incremental: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-235] Retorno das réguas: retorno por canal [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — 1.000 e-mails enviados e 52 pagos em até 30 dias —, confirmar que, quando o painel calcula, mostra 5,2% para e-mail. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-05 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: 1.000 e-mails enviados e 52 pagos em até 30 dias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: 1.000 e-mails enviados e 52 pagos em até 30 dias (dados do Anexo B).
4. Execute: o painel calcula.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ Mostra 5,2% para e-mail.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-236] Retorno das réguas: janela em aberto [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — comunicações enviadas há 10 dias —, confirmar que, quando o painel calcula, elas contam como em observação. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-05, RN-NOVO-MON-003 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: comunicações enviadas há 10 dias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: comunicações enviadas há 10 dias (dados do Anexo B).
4. Execute: o painel calcula.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ Elas contam como em observação.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-237] Retorno das réguas: sem envio [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um canal sem envios no ciclo —, confirmar que, quando o painel calcula, o retorno aparece como «—». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-05 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um canal sem envios no ciclo.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: um canal sem envios no ciclo (dados do Anexo B).
4. Execute: o painel calcula.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ O retorno aparece como «—».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-238] Retorno das réguas: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-05 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Painel Institucional de Cobrança**.
3. Se a tela aparecer, tente: retorno das réguas.
4. Copie o endereço da tela **Painel Institucional de Cobrança** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue retorno das réguas: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-239] Realizado × meta: meta não atingida [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — meta de 32% no ICMS Normal e realizado de 29,6% —, confirmar que, quando o painel é aberto, aparece alerta com −2,4 p.p.. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-06 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: meta de 32% no ICMS Normal e realizado de 29,6%.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: meta de 32% no ICMS Normal e realizado de 29,6% (dados do Anexo B).
4. Execute: o painel é aberto.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ Aparece alerta com −2,4 p.p.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-240] Realizado × meta: meta atingida [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — meta de 45% no IPVA e realizado de 51,2% —, confirmar que, quando o painel é aberto, aparece +6,2 p.p. sem alerta. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-06 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: meta de 45% no IPVA e realizado de 51,2%.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: meta de 45% no IPVA e realizado de 51,2% (dados do Anexo B).
4. Execute: o painel é aberto.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ Aparece +6,2 p.p. sem alerta.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-241] Realizado × meta: sem meta cadastrada [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um tributo sem meta no ciclo —, confirmar que, quando o painel é aberto, a coluna meta mostra «Sem meta». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-06 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um tributo sem meta no ciclo.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: um tributo sem meta no ciclo (dados do Anexo B).
4. Execute: o painel é aberto.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ A coluna meta mostra «Sem meta».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-242] Realizado × meta: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-06 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Painel Institucional de Cobrança**.
3. Se a tela aparecer, tente: realizado × meta.
4. Copie o endereço da tela **Painel Institucional de Cobrança** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue realizado × meta: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-243] Painel Institucional: painel completo [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — indicadores do ciclo —, confirmar que, quando o coordenador abre o painel, vê funil, KPIs, tendência e tabela por tributo. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-07 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: indicadores do ciclo.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: indicadores do ciclo (dados do Anexo B).
4. Execute: o coordenador abre o painel.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ Vê funil, KPIs, tendência e tabela por tributo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-244] Painel Institucional: filtro de ciclo [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o painel —, confirmar que, quando o coordenador escolhe o ciclo de maio, todos os indicadores mostram maio. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-07, RN-NOVO-MON-002, RN-NOVO-MON-004 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o painel.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: o painel (dados do Anexo B).
4. Execute: o coordenador escolhe o ciclo de maio.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ Todos os indicadores mostram maio.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-245] Painel Institucional: atendente [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um atendente —, confirmar que, quando tenta abrir o painel, o sistema nega o acesso. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-07, RN-NOVO-MON-002, RN-NOVO-MON-004 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um atendente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
3. Confirme que a situação de partida existe: um atendente (dados do Anexo B).
4. Execute: tenta abrir o painel.
5. Observe o resultado na tela **Painel Institucional de Cobrança**.

**Resultado esperado:**
- ✅ O sistema nega o acesso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-246] Painel Institucional: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-07 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Painel Institucional de Cobrança**.
3. Se a tela aparecer, tente: painel institucional.
4. Copie o endereço da tela **Painel Institucional de Cobrança** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue painel institucional: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-247] Regularizações por origem: lista filtrada [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — regularizações do ciclo —, confirmar que, quando o coordenador filtra «Resposta à cobrança» por WhatsApp, vê só essas. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-08 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: regularizações do ciclo.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Confirme que a situação de partida existe: regularizações do ciclo (dados do Anexo B).
4. Execute: o coordenador filtra «Resposta à cobrança» por WhatsApp.
5. Observe o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ Vê só essas.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-248] Regularizações por origem: exportação [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a lista filtrada —, confirmar que, quando o coordenador exporta, a exportação é registrada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-08, RN-NOVO-MON-001, RN-NOVO-GOV-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a lista filtrada.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Confirme que a situação de partida existe: a lista filtrada (dados do Anexo B).
4. Execute: o coordenador exporta.
5. Observe o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ A exportação é registrada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-249] Regularizações por origem: sem regularização [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um filtro sem resultado —, confirmar que, quando é aplicado, aparece «Nenhuma regularização para os filtros». |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-08, RN-NOVO-MON-001, RN-NOVO-GOV-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um filtro sem resultado.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem**.
3. Confirme que a situação de partida existe: um filtro sem resultado (dados do Anexo B).
4. Execute: é aplicado.
5. Observe o resultado na tela **Regularizações & Origem**.

**Resultado esperado:**
- ✅ Aparece «Nenhuma regularização para os filtros».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-250] Regularizações por origem: campo Período inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Período quando período de `01/01/2025` a `31/03/2026` (15 meses, acima do máx. 12 meses) e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-08 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Regularizações & Origem** e comece a ação: regularizações por origem.
3. Preencha o campo **Período** de forma que fique nesta situação: período de `01/01/2025` a `31/03/2026` (15 meses, acima do máx. 12 meses); preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «O período pode ter no máximo 12 meses» junto do campo **Período**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-251] Regularizações por origem: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-08 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Regularizações & Origem**.
3. Se a tela aparecer, tente: regularizações por origem.
4. Copie o endereço da tela **Regularizações & Origem** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue regularizações por origem: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-252] Estados da tela Regularizações & Origem [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Regularizações & Origem mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-08, RF-MOD-MONITORAMENTO-01, RF-MOD-MONITORAMENTO-02 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A) e abra **Cobrança Inteligente › Regularizações & Origem**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-253] Estados da tela Painel Institucional de Cobrança [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Painel Institucional de Cobrança mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-MONITORAMENTO-07, RF-MOD-MONITORAMENTO-03, RF-MOD-MONITORAMENTO-04 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A) e abra **Cobrança Inteligente › Painel Institucional de Cobrança**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

## [EPIC-007] — Governança, Acesso e Auditoria

> **Descrição da épica:** testes de homologação do módulo Governança, Acesso e Auditoria (MOD-GOVERNANCA): 6 funcionalidades e 2 telas.

### Pré-requisitos da Épica

- Ambiente de homologação disponível, com a massa de dados do Anexo B carregada e sem dado pessoal real.
- Usuários de teste dos perfis do Anexo A criados.

---

### [TC-254] Controlar acesso por papel: coordenador [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um coordenador —, confirmar que, quando consulta a carteira, vê todos os contribuintes. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-01 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um coordenador.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Administrador** (Anexo A).
2. Abra **Cobrança Inteligente › Auditoria**.
3. Confirme que a situação de partida existe: um coordenador (dados do Anexo B).
4. Execute: consulta a carteira.
5. Observe o resultado na tela **Auditoria**.

**Resultado esperado:**
- ✅ Vê todos os contribuintes.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-255] Controlar acesso por papel: auditor [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um auditor —, confirmar que, quando abre uma versão de critérios, lê, mas não consegue editar. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-01, RN-NOVO-ING-008, RN-NOVO-GOV-001 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um auditor.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Administrador** (Anexo A).
2. Abra **Cobrança Inteligente › Auditoria**.
3. Confirme que a situação de partida existe: um auditor (dados do Anexo B).
4. Execute: abre uma versão de critérios.
5. Observe o resultado na tela **Auditoria**.

**Resultado esperado:**
- ✅ Lê, mas não consegue editar.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-256] Controlar acesso por papel: acesso direto pelo endereço [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um gestor de integração —, confirmar que, quando tenta abrir um caso pelo endereço do registro, o sistema nega o acesso. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-01, RN-NOVO-ING-008, RN-NOVO-GOV-001 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um gestor de integração.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Administrador** (Anexo A).
2. Abra **Cobrança Inteligente › Auditoria**.
3. Confirme que a situação de partida existe: um gestor de integração (dados do Anexo B).
4. Execute: tenta abrir um caso pelo endereço do registro.
5. Observe o resultado na tela **Auditoria**.

**Resultado esperado:**
- ✅ O sistema nega o acesso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-257] Controlar acesso por papel: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Coordenador de Cobrança não executa esta funcionalidade, porque parâmetros, faixas e metas são só do Administrador. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-01 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Auditoria**.
3. Se a tela aparecer, tente: controlar acesso por papel.
4. Copie o endereço da tela **Auditoria** aberto pelo perfil autorizado, cole no navegador do perfil Coordenador de Cobrança e tente de novo.

**Resultado esperado:**
- ✅ O perfil Coordenador de Cobrança não consegue controlar acesso por papel: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-258] Isolar a visão do atendente: contribuinte do meu caso [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um caso atribuído ao atendente —, confirmar que, quando ele abre o contribuinte, vê os dados. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-02 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um caso atribuído ao atendente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: um caso atribuído ao atendente (dados do Anexo B).
4. Execute: ele abre o contribuinte.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ Vê os dados.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-259] Isolar a visão do atendente: caso reatribuído [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um caso que saiu da fila do atendente —, confirmar que, quando ele tenta abrir de novo, não tem mais acesso. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-02, RN-NOVO-MON-002, RN-NOVO-GOV-001 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um caso que saiu da fila do atendente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: um caso que saiu da fila do atendente (dados do Anexo B).
4. Execute: ele tenta abrir de novo.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ Não tem mais acesso.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-260] Isolar a visão do atendente: busca de outro contribuinte [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte sem caso do atendente —, confirmar que, quando ele busca pelo CNPJ, não encontra. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-02 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte sem caso do atendente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Atendente** (Anexo A).
2. Abra **Cobrança Inteligente › Minha Fila**.
3. Confirme que a situação de partida existe: um contribuinte sem caso do atendente (dados do Anexo B).
4. Execute: ele busca pelo CNPJ.
5. Observe o resultado na tela **Minha Fila**.

**Resultado esperado:**
- ✅ Não encontra.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-261] Mascarar CPF e restringir exportação: cPF mascarado [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um contribuinte pessoa física —, confirmar que, quando qualquer papel abre o formulário, vê o CPF mascarado. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um contribuinte pessoa física.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um contribuinte pessoa física (dados do Anexo B).
4. Execute: qualquer papel abre o formulário.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ Vê o CPF mascarado.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-262] Mascarar CPF e restringir exportação: exportação autorizada [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um coordenador —, confirmar que, quando exporta a carteira, o arquivo é gerado e a exportação fica registrada. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-03, RN-NOVO-GOV-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um coordenador.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um coordenador (dados do Anexo B).
4. Execute: exporta a carteira.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ O arquivo é gerado e a exportação fica registrada.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-263] Mascarar CPF e restringir exportação: exportação negada [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um atendente —, confirmar que, quando tenta exportar a fila, o sistema recusa. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-03, RN-NOVO-GOV-002 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um atendente.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte**.
3. Confirme que a situação de partida existe: um atendente (dados do Anexo B).
4. Execute: tenta exportar a fila.
5. Observe o resultado na tela **Visão Única do Contribuinte**.

**Resultado esperado:**
- ✅ O sistema recusa.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-264] Mascarar CPF e restringir exportação: campo CPF/CNPJ inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo CPF/CNPJ quando vazio e explica o que corrigir. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-03 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Abra **Cobrança Inteligente › Visão Única do Contribuinte** e comece a ação: mascarar cpf e restringir exportação.
3. Deixe o campo **CPF/CNPJ** em branco; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Preencha este campo» junto do campo **CPF/CNPJ**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-265] Mascarar CPF e restringir exportação: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Auditor não executa esta funcionalidade, porque o Auditor só lê; não altera nada. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-03 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Visão Única do Contribuinte**.
3. Se a tela aparecer, tente: mascarar cpf e restringir exportação.
4. Copie o endereço da tela **Visão Única do Contribuinte** aberto pelo perfil autorizado, cole no navegador do perfil Auditor e tente de novo.

**Resultado esperado:**
- ✅ O perfil Auditor não consegue mascarar cpf e restringir exportação: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-266] Auditar ações e parâmetros: alteração de parâmetro [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o percentual do grupo de controle em 3% —, confirmar que, quando o admin muda para 5%, a auditoria registra 3% → 5%, autor e data. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-04 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o percentual do grupo de controle em 3%.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Auditor** (Anexo A).
2. Abra **Cobrança Inteligente › Parâmetros, faixas de score e metas**.
3. Confirme que a situação de partida existe: o percentual do grupo de controle em 3% (dados do Anexo B).
4. Execute: o admin muda para 5%.
5. Observe o resultado na tela **Parâmetros, faixas de score e metas**.

**Resultado esperado:**
- ✅ A auditoria registra 3% → 5%, autor e data.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-267] Auditar ações e parâmetros: alteração de meta [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — a meta do IPVA —, confirmar que, quando o admin a altera, a alteração aparece no histórico. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-04, RN-NOVO-CQ-002, RN-NOVO-GOV-003 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: a meta do IPVA.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Auditor** (Anexo A).
2. Abra **Cobrança Inteligente › Parâmetros, faixas de score e metas**.
3. Confirme que a situação de partida existe: a meta do IPVA (dados do Anexo B).
4. Execute: o admin a altera.
5. Observe o resultado na tela **Parâmetros, faixas de score e metas**.

**Resultado esperado:**
- ✅ A alteração aparece no histórico.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-268] Auditar ações e parâmetros: tentativa de apagar evento [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um evento de auditoria —, confirmar que, quando qualquer papel tenta excluir, o sistema recusa. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-04 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um evento de auditoria.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Auditor** (Anexo A).
2. Abra **Cobrança Inteligente › Parâmetros, faixas de score e metas**.
3. Confirme que a situação de partida existe: um evento de auditoria (dados do Anexo B).
4. Execute: qualquer papel tenta excluir.
5. Observe o resultado na tela **Parâmetros, faixas de score e metas**.

**Resultado esperado:**
- ✅ O sistema recusa.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-269] Cumprir a regra «Auditoria imutável» [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que, quando um evento de auditoria é gravado, nenhum papel pode alterá-lo nem excluí-lo (RN-NOVO-GOV-003). |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-04, RN-NOVO-GOV-003 |

**Pré-condições:**
- Situação preparada com a massa do Anexo B: um evento de auditoria é gravado.
- Usuário de teste do perfil Auditor disponível (Anexo A).

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Abra **Cobrança Inteligente › Parâmetros, faixas de score e metas**.
3. Localize o registro de teste em que um evento de auditoria é gravado.
4. Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).
5. Confira o resultado na tela **Parâmetros, faixas de score e metas**.

**Resultado esperado:**
- ✅ Nenhum papel pode alterá-lo nem excluí-lo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-270] Administrar parâmetros, faixas e metas: parâmetro alterado [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o parâmetro «janela de atribuição» em 30 dias —, confirmar que, quando o admin muda para 45, as próximas atribuições usam 45 dias. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-05 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o parâmetro «janela de atribuição» em 30 dias.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Administrador** (Anexo A).
2. Abra **Cobrança Inteligente › Parâmetros, faixas de score e metas**.
3. Confirme que a situação de partida existe: o parâmetro «janela de atribuição» em 30 dias (dados do Anexo B).
4. Execute: o admin muda para 45.
5. Observe o resultado na tela **Parâmetros, faixas de score e metas**.

**Resultado esperado:**
- ✅ As próximas atribuições usam 45 dias.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-271] Administrar parâmetros, faixas e metas: meta nova [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o ciclo de julho sem meta —, confirmar que, quando o admin cadastra meta de 32% para ICMS Normal, o painel passa a comparar com 32%. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-05 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o ciclo de julho sem meta.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Administrador** (Anexo A).
2. Abra **Cobrança Inteligente › Parâmetros, faixas de score e metas**.
3. Confirme que a situação de partida existe: o ciclo de julho sem meta (dados do Anexo B).
4. Execute: o admin cadastra meta de 32% para ICMS Normal.
5. Observe o resultado na tela **Parâmetros, faixas de score e metas**.

**Resultado esperado:**
- ✅ O painel passa a comparar com 32%.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-272] Administrar parâmetros, faixas e metas: valor fora do limite [BORDA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — o parâmetro do grupo de controle —, confirmar que, quando o admin informa 60%, o sistema recusa e mostra «O percentual deve ficar entre 1% e 20%». |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-05 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: o parâmetro do grupo de controle.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Administrador** (Anexo A).
2. Abra **Cobrança Inteligente › Parâmetros, faixas de score e metas**.
3. Confirme que a situação de partida existe: o parâmetro do grupo de controle (dados do Anexo B).
4. Execute: o admin informa 60%.
5. Observe o resultado na tela **Parâmetros, faixas de score e metas**.

**Resultado esperado:**
- ✅ O sistema recusa e mostra «O percentual deve ficar entre 1% e 20%».

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-273] Administrar parâmetros, faixas e metas: campo Valor inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Valor quando fora do limite e explica o que corrigir. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-05 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Administrador** (Anexo A).
2. Abra **Cobrança Inteligente › Parâmetros, faixas de score e metas** e comece a ação: administrar parâmetros, faixas e metas.
3. Preencha o campo **Valor** de forma que fique nesta situação: fora do limite; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem mensagem do parâmetro junto do campo **Valor**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-274] Administrar parâmetros, faixas e metas: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Coordenador de Cobrança não executa esta funcionalidade, porque parâmetros, faixas e metas são só do Administrador. |
| **Perfil do testador** | Coordenador de Cobrança |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-05 |

**Pré-condições:**
- Usuário de teste do perfil Coordenador de Cobrança disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Coordenador de Cobrança** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Parâmetros, faixas de score e metas**.
3. Se a tela aparecer, tente: administrar parâmetros, faixas e metas.
4. Copie o endereço da tela **Parâmetros, faixas de score e metas** aberto pelo perfil autorizado, cole no navegador do perfil Coordenador de Cobrança e tente de novo.

**Resultado esperado:**
- ✅ O perfil Coordenador de Cobrança não consegue administrar parâmetros, faixas e metas: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-275] Consultar auditoria: consulta [PRINCIPAL]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — eventos do último mês —, confirmar que, quando o auditor filtra por usuário, vê os eventos desse usuário. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-06 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: eventos do último mês.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Auditor** (Anexo A).
2. Abra **Cobrança Inteligente › Auditoria**.
3. Confirme que a situação de partida existe: eventos do último mês (dados do Anexo B).
4. Execute: o auditor filtra por usuário.
5. Observe o resultado na tela **Auditoria**.

**Resultado esperado:**
- ✅ Vê os eventos desse usuário.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-276] Consultar auditoria: versões [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — as versões de critérios —, confirmar que, quando o auditor abre a versão 3, vê critérios, fundamentação e quem publicou. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-06, RN-NOVO-GOV-003 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: as versões de critérios.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Auditor** (Anexo A).
2. Abra **Cobrança Inteligente › Auditoria**.
3. Confirme que a situação de partida existe: as versões de critérios (dados do Anexo B).
4. Execute: o auditor abre a versão 3.
5. Observe o resultado na tela **Auditoria**.

**Resultado esperado:**
- ✅ Vê critérios, fundamentação e quem publicou.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-277] Consultar auditoria: tentativa de editar [REGRA]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Partindo desta situação — um auditor —, confirmar que, quando tenta editar qualquer registro, o sistema recusa. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-06, RN-NOVO-GOV-003 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Situação de partida montada com a massa do Anexo B: um auditor.

**Passos:**
1. Entre na instância com o usuário de teste do perfil **Auditor** (Anexo A).
2. Abra **Cobrança Inteligente › Auditoria**.
3. Confirme que a situação de partida existe: um auditor (dados do Anexo B).
4. Execute: tenta editar qualquer registro.
5. Observe o resultado na tela **Auditoria**.

**Resultado esperado:**
- ✅ O sistema recusa.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-278] Consultar auditoria: campo Período inválido [VALIDAÇÃO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela recusa o campo Período quando intervalo acima de 12 meses e explica o que corrigir. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-06 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A).
2. Abra **Cobrança Inteligente › Auditoria** e comece a ação: consultar auditoria.
3. Preencha o campo **Período** de forma que fique nesta situação: intervalo acima de 12 meses; preencha os demais campos obrigatórios com valores válidos do Anexo B.
4. Clique em **Salvar** (ou na ação de confirmar da tela).

**Resultado esperado:**
- ✅ O sistema não salva e mostra a mensagem «Escolha no máximo 12 meses» junto do campo **Período**.
- ✅ Nada é gravado; ao corrigir o campo, o registro salva normalmente.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-279] Consultar auditoria: perfil sem permissão não consegue [ACESSO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que o perfil Atendente não executa esta funcionalidade, porque a auditoria é só do Auditor. |
| **Perfil do testador** | Atendente |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-06 |

**Pré-condições:**
- Usuário de teste do perfil Atendente disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Atendente** (Anexo A).
2. Procure no menu **Cobrança Inteligente** a tela **Auditoria**.
3. Se a tela aparecer, tente: consultar auditoria.
4. Copie o endereço da tela **Auditoria** aberto pelo perfil autorizado, cole no navegador do perfil Atendente e tente de novo.

**Resultado esperado:**
- ✅ O perfil Atendente não consegue consultar auditoria: a opção não aparece ou o sistema mostra que não há permissão.
- ✅ Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu).

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-280] Estados da tela Parâmetros, faixas de score e metas [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Parâmetros, faixas de score e metas mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Administrador |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-05, RF-MOD-GOVERNANCA-04, RF-MOD-SCORE-02 |

**Pré-condições:**
- Usuário de teste do perfil Administrador disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Administrador** (Anexo A) e abra **Cobrança Inteligente › Parâmetros, faixas de score e metas**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

### [TC-281] Estados da tela Auditoria [ESTADO]

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Confirmar que a tela Auditoria mostra corretamente os 6 estados previstos: Carregando, Sucesso, Erro de validação, Erro de sistema, Vazio, Offline. |
| **Perfil do testador** | Auditor |
| **RN/RF relacionado** | RF-MOD-GOVERNANCA-06, RF-MOD-GOVERNANCA-01, RF-MOD-GOVERNANCA-03 |

**Pré-condições:**
- Usuário de teste do perfil Auditor disponível (Anexo A).
- Massa do Anexo B carregada.

**Passos:**
1. Entre com o usuário de teste do perfil **Auditor** (Anexo A) e abra **Cobrança Inteligente › Auditoria**.
2. Estado **Carregando**: Abra a tela logo após entrar e observe enquanto os dados chegam.
3. Estado **Sucesso**: Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.
4. Estado **Erro de validação**: Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).
5. Estado **Erro de sistema**: Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.
6. Estado **Vazio**: Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.
7. Estado **Offline**: Desligue a rede do computador e tente recarregar a tela; depois religue.

**Resultado esperado:**
- ✅ Estado **Carregando**: Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.
- ✅ Estado **Sucesso**: Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.
- ✅ Estado **Erro de validação**: A tela não salva, marca o campo com problema e diz em português o que corrigir.
- ✅ Estado **Erro de sistema**: A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.
- ✅ Estado **Vazio**: A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.
- ✅ Estado **Offline**: O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.

**Resultado obtido:** _(em branco — preenchido na homologação)_

**Em caso de falha:** Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso.

---

## Tamanho das épicas

Épicas grandes ficam difíceis de homologar numa sessão. As abaixo passam do tamanho recomendado (cerca de 20 casos, 6 funcionalidades ou 4 telas); a sugestão é dividir pela jornada indicada. Os casos não foram cortados.

| Épica | Casos | Funcionalidades | Telas | Sugestão de divisão |
|-------|-------|-----------------|-------|---------------------|
| EPIC-001 — Ingestão e Carteira Consolidada | 75 | 15 | 3 | (a) recebimento e validação de lotes; (b) fechamento do ciclo, falhas e reprocesso; (c) carteira e visão única |
| EPIC-002 — Qualificação e Parametrização da Carteira | 35 | 6 | 2 | (a) critérios e versões; (b) simulação, confirmação e grupo de controle |
| EPIC-003 — Scoring de Liquidez | 21 | 4 | 1 | (a) recebimento e faixas; (b) painel e operação sem score |
| EPIC-004 — Réguas de Cobrança Massificada | 46 | 9 | 2 | (a) montagem e controle da régua; (b) envio, consentimento e status de entrega |
| EPIC-005 — Cobrança Qualificada | 37 | 7 | 2 | (a) fila e distribuição; (b) dossiê, interações e encerramento |
| EPIC-006 — Monitoramento e KPIs | 39 | 8 | 2 | (a) regularização e origem; (b) painéis e indicadores |
| EPIC-007 — Governança, Acesso e Auditoria | 28 | 6 | 2 | (a) acesso, isolamento e mascaramento; (b) parâmetros e auditoria |

---

## Matriz de cenários por funcionalidade

Cada funcionalidade precisa de caso para o caminho feliz, entrada inválida, regra de negócio, perfil sem permissão e situação-limite. Quando uma categoria não se aplica, a última coluna explica por quê.

| RF | Caminho feliz | Validação | Regra | Acesso | Limite (· estado) | Justificativa da categoria ausente |
|----|---------------|-----------|-------|--------|-------------------|------------------------------------|
| RF-MOD-INGESTAO-01 | TC-001 | TC-002 | TC-004 | TC-003 | — | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-INGESTAO-02 | TC-005 | TC-007 | TC-008 | TC-009 | — | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-INGESTAO-03 | TC-010 | — | TC-011, TC-013 | TC-014 | TC-012 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-INGESTAO-04 | TC-015 | — | TC-018 | TC-019 | TC-016, TC-017 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-INGESTAO-05 | TC-020 | TC-023 | TC-021, TC-024 | TC-025 | TC-022 | — |
| RF-MOD-INGESTAO-06 | TC-026 | — | TC-027, TC-024 | TC-029 | TC-028 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-INGESTAO-07 | TC-030 | — | TC-031, TC-032, TC-018 | TC-033 | — | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-INGESTAO-08 | TC-034 | TC-036 | TC-008 | TC-037 | TC-035 | — |
| RF-MOD-INGESTAO-09 | TC-038 | TC-041 | TC-039, TC-040, TC-042 | TC-043 | — | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-INGESTAO-10 | TC-044 | — | — | TC-047 | — · TC-045, TC-046 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem REGRA: a funcionalidade não tem regra de negócio própria no catálogo de regras; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-INGESTAO-11 | TC-048 | — | TC-049, TC-051 | TC-052 | TC-050 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-INGESTAO-12 | TC-053 | — | TC-055, TC-056 | TC-057 | — · TC-054 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-INGESTAO-13 | TC-058 | TC-061 | TC-060, TC-013, TC-062 | TC-063 | TC-059 | — |
| RF-MOD-INGESTAO-14 | TC-064 | TC-067 | TC-065 | TC-068 | TC-066 | — |
| RF-MOD-INGESTAO-15 | TC-069 | TC-070 | TC-071, TC-008, TC-018 | TC-072 | — | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-QUALIFICACAO-01 | TC-076 | TC-079 | TC-080, TC-081 | TC-082 | TC-077, TC-078 | — |
| RF-MOD-QUALIFICACAO-02 | TC-083 | TC-086 | TC-080, TC-088, TC-089 | TC-090 | TC-087 · TC-084, TC-085 | — |
| RF-MOD-QUALIFICACAO-03 | TC-091 | — | TC-081, TC-089 | TC-094 | TC-093 · TC-092 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-QUALIFICACAO-04 | TC-095 | — | TC-096, TC-098 | TC-099 | TC-097 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-QUALIFICACAO-05 | TC-100 | — | TC-103 | TC-104 | TC-101 · TC-102 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-QUALIFICACAO-06 | TC-105 | — | TC-088, TC-089 | TC-108 | — · TC-106, TC-107 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-SCORE-01 | TC-111 | TC-113 | TC-114 | TC-115 | — | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-SCORE-02 | TC-116 | TC-119 | TC-118, TC-120 | TC-121 | TC-117 | — |
| RF-MOD-SCORE-03 | TC-122 | — | TC-124, TC-114 | TC-125 | TC-123 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-SCORE-04 | TC-126 | — | TC-127, TC-128, TC-129 | TC-130 | — | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-REGUAS-01 | TC-132 | TC-135 | TC-133, TC-136 | TC-137 | TC-134 | — |
| RF-MOD-REGUAS-02 | TC-138 | — | TC-139, TC-042, TC-098, TC-141 | TC-142 | TC-140 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-REGUAS-03 | TC-143 | — | TC-141 | TC-146 | — · TC-144, TC-145 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-REGUAS-04 | TC-147 | — | TC-148, TC-150 | TC-151 | TC-149 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-REGUAS-05 | TC-152 | TC-154 | TC-153, TC-150 | TC-155 | — | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-REGUAS-06 | TC-156 | — | — | TC-159 | TC-157 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem REGRA: a funcionalidade não tem regra de negócio própria no catálogo de regras |
| RF-MOD-REGUAS-07 | TC-160 | — | TC-163 | TC-164 | TC-161, TC-162 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-REGUAS-08 | TC-165 | TC-168 | TC-169 | TC-170 | — · TC-166, TC-167 | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-REGUAS-09 | TC-171 | TC-174 | TC-172 | TC-175 | TC-173 | — |
| RF-MOD-QUALIFICADA-01 | TC-178 | — | TC-179, TC-042, TC-098 | TC-181 | TC-180 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-QUALIFICADA-02 | TC-182 | — | TC-183, TC-184, TC-185 | TC-186 | — | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-QUALIFICADA-03 | TC-187 | — | TC-129, TC-114, TC-190 | TC-189 | TC-188 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-QUALIFICADA-04 | TC-191 | — | TC-192, TC-193, TC-056, TC-194 | TC-195 | — | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-QUALIFICADA-05 | TC-196 | TC-199 | TC-197, TC-198, TC-201 | TC-202 | TC-200 | — |
| RF-MOD-QUALIFICADA-06 | TC-203 | TC-206 | — | TC-207 | — · TC-204, TC-205 | sem REGRA: a funcionalidade não tem regra de negócio própria no catálogo de regras; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-QUALIFICADA-07 | TC-208 | TC-211 | TC-210, TC-185, TC-201 | TC-212 | — · TC-209 | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-MONITORAMENTO-01 | TC-215 | — | TC-216, TC-217, TC-218 | TC-219 | — | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-MONITORAMENTO-02 | TC-220 | — | TC-223, TC-224 | TC-225 | TC-221 · TC-222 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-MONITORAMENTO-03 | TC-226 | — | TC-227, TC-218 | TC-229 | — · TC-228 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-MONITORAMENTO-04 | TC-230 | — | TC-231, TC-103, TC-224, TC-233 | TC-234 | TC-232 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-MONITORAMENTO-05 | TC-235 | — | TC-236, TC-224 | TC-238 | — · TC-237 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-MONITORAMENTO-06 | TC-239 | — | TC-240 | TC-242 | — · TC-241 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-MONITORAMENTO-07 | TC-243 | — | TC-244, TC-245, TC-129, TC-218 | TC-246 | — | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-MONITORAMENTO-08 | TC-247 | TC-250 | TC-248, TC-223, TC-194 | TC-251 | TC-249 | — |
| RF-MOD-GOVERNANCA-01 | TC-254 | — | TC-255, TC-256, TC-004, TC-062 | TC-257 | — | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-GOVERNANCA-02 | TC-258 | — | TC-129, TC-062 | TC-260 | TC-259 | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela |
| RF-MOD-GOVERNANCA-03 | TC-261 | TC-264 | TC-262, TC-263, TC-194 | TC-265 | — | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-GOVERNANCA-04 | TC-266 | — | TC-267, TC-201, TC-269 | TC-268 | — | sem VALIDAÇÃO: a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela; sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |
| RF-MOD-GOVERNANCA-05 | TC-270 | TC-273 | — | TC-274 | TC-272 · TC-271 | sem REGRA: a funcionalidade não tem regra de negócio própria no catálogo de regras |
| RF-MOD-GOVERNANCA-06 | TC-275 | TC-278 | TC-276, TC-277, TC-269 | TC-279 | — | sem BORDA: os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela |

---

## Cobertura RN × Caso

| RN | Descrição curta | Casos que cobrem | Status |
|----|-----------------|------------------|--------|
| RN-NOVO-ING-001 | Consolidação por contribuinte | TC-011, TC-012, TC-013, TC-059, TC-060 | ✅ Coberta |
| RN-NOVO-ING-002 | Regularização encerra a abordagem no ciclo | TC-039, TC-040, TC-042, TC-139, TC-140, TC-179, TC-180 | ✅ Coberta |
| RN-NOVO-ING-003 | Continuidade na transição MPI → Big Data | TC-049, TC-050, TC-051 | ✅ Coberta |
| RN-NOVO-ING-004 | Rejeição de documento inválido | TC-007, TC-008, TC-035, TC-036, TC-070, TC-071 | ✅ Coberta |
| RN-NOVO-ING-005 | Reenvio não duplica | TC-016, TC-017, TC-018, TC-031, TC-032, TC-070, TC-071 | ✅ Coberta |
| RN-NOVO-ING-006 | Falha de uma fonte não para as outras | TC-021, TC-022, TC-024, TC-027, TC-028 | ✅ Coberta |
| RN-NOVO-ING-007 | Sinalização coercitiva é só informativa | TC-055, TC-056, TC-192, TC-193 | ✅ Coberta |
| RN-NOVO-ING-008 | Só a carga grava dados de origem | TC-002, TC-004, TC-255, TC-256 | ✅ Coberta |
| RN-NOVO-QUA-001 | Critérios configuráveis e versionados | TC-077, TC-078, TC-080 | ✅ Coberta |
| RN-NOVO-QUA-002 | Um eixo por contribuinte no ciclo | TC-096, TC-097, TC-098, TC-139, TC-140, TC-179, TC-180 | ✅ Coberta |
| RN-NOVO-QUA-003 | Sorteio do grupo de controle | TC-101, TC-103, TC-231, TC-232 | ✅ Coberta |
| RN-NOVO-QUA-004 | Aplicação dos critérios | TC-077, TC-078, TC-081, TC-093 | ✅ Coberta |
| RN-NOVO-QUA-005 | Versão publicada e carteira confirmada são imutáveis | TC-088 | ✅ Coberta |
| RN-NOVO-QUA-006 | Prévia vigente para publicar | TC-089, TC-093 | ✅ Coberta |
| RN-NOVO-SCO-001 | Fallback sem score | TC-113, TC-114, TC-123, TC-124, TC-188 | ✅ Coberta |
| RN-NOVO-SCO-002 | Classificação do score em faixas | TC-117, TC-118, TC-120 | ✅ Coberta |
| RN-NOVO-REG-001 | Reenvio limitado | TC-161, TC-162, TC-163 | ✅ Coberta |
| RN-NOVO-REG-002 | Escalonamento da régua | TC-139, TC-140, TC-141 | ✅ Coberta |
| RN-NOVO-REG-003 | Consentimento por canal | TC-148, TC-149, TC-150, TC-153, TC-154 | ✅ Coberta |
| RN-NOVO-REG-004 | Régua consistente | TC-133, TC-134, TC-136 | ✅ Coberta |
| RN-NOVO-REG-005 | Pausa não cancela o enviado | TC-169 | ✅ Coberta |
| RN-NOVO-CQ-001 | Distribuição automática | TC-183, TC-184, TC-185, TC-210 | ✅ Coberta |
| RN-NOVO-CQ-002 | Ações auditáveis e imutáveis | TC-197, TC-198, TC-201, TC-210, TC-267 | ✅ Coberta |
| RN-NOVO-CQ-003 | Prioridade da fila | TC-188, TC-190 | ✅ Coberta |
| RN-NOVO-MON-001 | Origem da regularização | TC-221, TC-223, TC-248, TC-249 | ✅ Coberta |
| RN-NOVO-MON-002 | Visibilidade por perfil | TC-127, TC-128, TC-129, TC-188, TC-244, TC-245, TC-259 | ✅ Coberta |
| RN-NOVO-MON-003 | Atribuição da origem | TC-221, TC-224, TC-231, TC-232, TC-236 | ✅ Coberta |
| RN-NOVO-MON-004 | Indicadores direto das tabelas | TC-216, TC-217, TC-218, TC-227, TC-244, TC-245 | ✅ Coberta |
| RN-NOVO-MON-005 | Efeito incremental | TC-231, TC-232, TC-233 | ✅ Coberta |
| RN-NOVO-GOV-001 | Acesso na camada de dados | TC-059, TC-060, TC-062, TC-255, TC-256, TC-259 | ✅ Coberta |
| RN-NOVO-GOV-002 | CPF mascarado e exportação registrada | TC-192, TC-193, TC-194, TC-248, TC-249, TC-262, TC-263 | ✅ Coberta |
| RN-NOVO-GOV-003 | Auditoria imutável | TC-267, TC-269, TC-276, TC-277 | ✅ Coberta |

---

## Anexos

### Anexo A — Usuários de Teste

| Perfil | Usuário | Senha | Observação |
|--------|---------|-------|------------|
| Gestor de Integração | `teste.gestor.integracao` | [definir com a equipe — nunca registrar aqui] | Usa o simulador de cargas |
| Coordenador de Cobrança | `teste.coordenador` | [definir com a equipe — nunca registrar aqui] | Publica critérios, confirma carteira, gerencia réguas |
| Atendente | `teste.atendente.a1` | [definir com a equipe — nunca registrar aqui] | Dono dos casos de teste da fila A1 |
| Atendente | `teste.atendente.a2` | [definir com a equipe — nunca registrar aqui] | Segundo atendente, para testar o isolamento e a distribuição |
| Atendente | `teste.atendente.a3` | [definir com a equipe — nunca registrar aqui] | Terceiro atendente do grupo de distribuição |
| Auditor | `teste.auditor` | [definir com a equipe — nunca registrar aqui] | Só leitura |
| Administrador | `teste.admin` | [definir com a equipe — nunca registrar aqui] | Parâmetros, faixas e metas |

### Anexo B — Dados Pré-necessários

Todos os dados são fictícios. CPF e CNPJ abaixo são números de teste com dígito válido, que não pertencem a pessoas reais; nunca usar dado de contribuinte real (LGPD).

| Dado | Valor de teste | Usado em |
|------|----------------|----------|
| Contribuinte PJ principal | `Empresa Sintética Ltda`, CNPJ `11.222.333/0001-81` | ingestão, carteira, casos |
| Contribuinte PF principal | `Contribuinte Sintético da Silva`, CPF `529.982.247-25` | ingestão, réguas, mascaramento |
| Documento inválido | CPF `529.982.247-00` (dígito errado) | rejeição de registro |
| Documento sem contribuinte | CPF `111.444.777-35` | score de contribuinte inexistente |
| Cinco contribuintes da versão de critérios | A a E, conforme o caso de aplicação dos critérios | qualificação |
| Carteira de 1.001 itens | gerada pelo simulador com débitos de ICMS acima do valor mínimo | grupo de controle |
| Grupo de atendentes | `Grupo ICMS Teste` com A1, A2 e A3 | distribuição de casos |
| Faixas de score | Baixa 0,00–0,40 · Média 0,40–0,70 · Alta 0,70–1,00 | score |
| Parâmetros | grupo de controle 3% · janela de atribuição 30 dias · tentativas de reenvio 3 | vários |
| Opt-in | IPVA: e-mail e SMS autorizados para o CPF de teste | réguas |

### Anexo C — Ambiente

| Campo | Valor |
|-------|-------|
| Endereço | Instância de homologação da SEFAZ-MT (a preencher) |
| Versão da aplicação | A preencher |
| Data | A preencher |
| Testador | A preencher |
