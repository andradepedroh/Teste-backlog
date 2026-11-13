# HLD Funcional — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

> **Fase:** Explore · **Versão:** 0.1 · **Status:** preliminar
> **Documentos irmãos:** [Funcional](./especificacao-funcional.md) · [Técnica](./especificacao-tecnica.md) · [Modelo de Dados](./modelo-de-dados.md) · [GAPs](./gaps.md)

## Changelog
| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-11-13 | versão inicial, a partir da ETF, da wiki TO-BE e do plano de implementação v3 (simulação do fluxo, sem protótipo) |

## 1. Visão geral do produto/solução

A **Cobrança Inteligente** é a plataforma única de gestão da cobrança administrativa do crédito
tributário da SEFAZ-MT (produto 2.6 do Profisco II). Hoje os débitos ficam espalhados entre Conta
Corrente Fiscal (CCF), MPI, IPVA, ITCD, SNE e planilhas, integrados à mão e sem visão única do
contribuinte. A seleção de quem cobrar depende do conhecimento de quem coordena, o disparo exige
confirmação manual e não há como medir o efeito da cobrança.

O produto passa a:

- **consolidar** os débitos de todas as fontes numa visão única por contribuinte, atualizada a cada ciclo;
- **qualificar** a carteira por critérios parametrizáveis, versionados e auditáveis, usando o score de
  liquidez da UFMT quando ele existir;
- **cobrar em massa** por réguas automáticas de e-mail, SMS e WhatsApp, respeitando o consentimento;
- **cobrar de forma qualificada**, distribuindo casos priorizados aos atendentes, com histórico de cada contato;
- **medir** a efetividade com indicadores e grupo de controle, separando a regularização que veio da
  cobrança da que aconteceria de qualquer forma.

**Para quem:** a Coordenação de Cobrança (CPRF) e os atendentes de cobrança. O contribuinte recebe as
comunicações, mas não usa o sistema.

**Onde roda:** aplicação escopada no ServiceNow (App Engine), com as telas nativas de lista e
formulário da plataforma, limitadas por papel, e dois painéis no Platform Analytics. Não há tela
customizada.

**Fora do escopo:** desenvolver o modelo de score (é da UFMT), inscrição em dívida ativa e execução
fiscal (PGE e produto 2.4), e a integração ponta a ponta com cada sistema parceiro (as APIs são
testadas com lotes simulados).

## 2. Visão geral dos módulos

| Código | Módulo | Propósito |
|---|---|---|
| MOD-INGESTAO | Ingestão e Carteira Consolidada | Receber os débitos das fontes por API e manter a visão única do contribuinte e a posição por tributo |
| MOD-QUALIFICACAO | Qualificação e Parametrização da Carteira | Definir critérios versionados, simular e confirmar a carteira, separar massificada de qualificada e sortear o grupo de controle |
| MOD-SCORE | Scoring de Liquidez | Receber o score da UFMT, classificar em faixas e operar sem score quando ele faltar |
| MOD-REGUAS | Réguas de Cobrança Massificada | Enviar comunicações automáticas e escalonadas por e-mail, SMS e WhatsApp |
| MOD-QUALIFICADA | Cobrança Qualificada | Criar, distribuir e priorizar casos para os atendentes, com dossiê e registro de interações |
| MOD-MONITORAMENTO | Monitoramento e KPIs | Medir funil, regularização, origem da regularização, efeito incremental e metas |
| MOD-GOVERNANCA | Governança, Acesso e Auditoria | Controlar o acesso por papel, mascarar dados pessoais, auditar ações e administrar parâmetros |

## 3. Visão por módulo — principais funcionalidades

### MOD-INGESTAO — Ingestão e Carteira Consolidada

- Receber débitos de CCF, MPI, Big Data, IPVA, ITCD e SNE/DT-e por API, em lotes e pacotes
- Validar CPF/CNPJ e devolver ao parceiro os registros rejeitados
- Consolidar os débitos por contribuinte e manter a posição por tributo
- Fechar o ciclo diário de carga, acompanhar a situação de cada fonte e seguir operando quando uma fonte falha
- Atualizar a regularização e o parcelamento durante o ciclo, e alertar parcelamento em risco
- Receber sinalizações de cobrança coercitiva de outras coordenadorias, só como informação
- Mostrar a carteira consolidada e a visão única do contribuinte

### MOD-QUALIFICACAO — Qualificação e Parametrização da Carteira

- Parametrizar critérios de carteira (valor, tributo, atraso, instrumento, contumazes, score)
- Versionar os critérios com prévia obrigatória antes de publicar
- Simular a carteira e confirmá-la
- Separar a carteira em massificada e qualificada
- Sortear o grupo de controle de forma reproduzível

### MOD-SCORE — Scoring de Liquidez

- Receber o score da UFMT por lote, com a versão do modelo
- Classificar o score em faixas parametrizáveis
- Operar com critérios determinísticos para quem não tem score
- Mostrar cobertura e distribuição do score no Painel do Score

### MOD-REGUAS — Réguas de Cobrança Massificada

- Montar réguas com etapas, prazos, canais e modelos de mensagem por segmento
- Calcular diariamente a etapa devida e enviar sem confirmação manual
- Escalonar, encerrar ao regularizar e encaminhar à cobrança qualificada quem esgotou a régua
- Respeitar opt-in e opt-out no momento do envio
- Receber o status de entrega, reenviar falhas e pausar a régua

### MOD-QUALIFICADA — Cobrança Qualificada

- Criar casos a partir da carteira confirmada ou do esgotamento da régua
- Distribuir os casos entre atendentes e priorizar a fila
- Montar o dossiê do contribuinte no formulário do caso
- Registrar interações que não podem ser alteradas e follow-ups com lembrete

### MOD-MONITORAMENTO — Monitoramento e KPIs

- Marcar quem foi notificado e quem regularizou
- Atribuir a origem da regularização (espontânea ou resposta à cobrança)
- Calcular funil, taxa de regularização, efeito incremental, retorno das réguas e realizado × meta
- Mostrar o Painel Institucional de Cobrança e a lista de regularizações por origem

### MOD-GOVERNANCA — Governança, Acesso e Auditoria

- Controlar o acesso por cinco papéis na camada de dados
- Isolar a visão do atendente aos próprios casos
- Mascarar o CPF e restringir a exportação
- Registrar auditoria de ações e de alteração de parâmetros
- Administrar parâmetros, faixas de score e metas
