# Telas Comuns (arquétipos transversais)

Arquétipos de tela reutilizáveis de **Cobrança Inteligente**: padrões de layout/comportamento que se repetem nas features. Uma tela de feature que segue um arquétipo **referencia-o e descreve só o que muda** (colunas, filtros, ações, estados). Objetivo: **minimizar o número de telas** — pensar telas transversalmente e **fundir** vistas (abas, drawers, painéis laterais). Cada `#### T-NN` declara seu `**Arquétipo:** A-NN`. Componentes citados seguem [componentes.md](componentes.md).

> IDs estáveis `A1`…`A-NN`. Novo padrão recorrente (≥ 2 features) vira arquétipo aqui, não nasce duplicado.

## Arquétipos

### A1 — Painel de Indicadores (Dashboard)
Painel de KPIs com filtros, cartões de indicador, gráfico principal e tabela de detalhe; visão muda por perfil (RN-11).

```wireframe
# Painel
[Ciclo v] [Tributo v] [Canal v]
[[ Recuperado | Taxa regularização | Incremental vs controle ]]
(!) alerta de meta
[~ tendência por ciclo ~]
card "Detalhe por dimensão":
  | Dimensão | Valor | Meta | Δ |
  | linha | valor | meta | delta |
[Exportar] [Configurar visão]
```
- **Quando usar:** visão gerencial agregada e comparativa; NÃO usar para trabalhar um registro individual.
- **Componentes:** toolbar, select, card, chart, table, button.
- **Instâncias:** Monitoramento · T-MON-01; Réguas · T-REG-03 (efetividade); Cobrança Qualificada · T-CQ-01 (carga por atendente — combinada com A3).

### A2 — Lista / Fila com Filtros
Coleção pesquisável e filtrável com ações por linha e em lote; base para carteiras, contribuintes, casos, comunicações.

```wireframe
# Coleção
[Buscar____] [Tributo v] [Status v] [Segmento v] [Ordenar por v]
| Contribuinte | Tributo | Valor | Atraso | Status | Ação |
| reg | reg | reg | reg | reg | [Abrir] |
[Selecionar lote] [Ação em lote] [Exportar]
```
- **Quando usar:** navegar/triar muitos registros homogêneos; ações em lote.
- **Componentes:** toolbar, input, select, table, checkbox, button.
- **Instâncias:** Ingestão · T-ING-02 (carteira consolidada); Qualificação · T-QC-02 (prévia); Réguas · T-REG-02 (execução); Cobrança Qualificada · T-CQ-02 (minha fila); Monitoramento · T-MON-02 (comunicações).

### A3 — Formulário de Configuração (parametrização + versionamento)
Formulário de parâmetros com validação, fundamentação e ação de validar/publicar versão (RN-03, RNF-T-AUD-02).

```wireframe
# Configurar
card "Parâmetros":
  [Valor mínimo____] [Tributo v]
  [Tempo de atraso____] [Threshold de score____]
  - exclusões selecionáveis
(!) regra/validação
[Versão____]
[Validar] [Publicar versão] [Ver histórico]
```
- **Quando usar:** definir/versionar critérios, réguas, metas; NÃO usar para dados operacionais do dia a dia.
- **Componentes:** toolbar, card, input, select, checkbox, banner, button.
- **Instâncias:** Qualificação · T-QC-01 (critérios); Réguas · T-REG-01 (editor de régua); Monitoramento · T-MON-03 (metas/grupo de controle); Cobrança Qualificada · T-CQ-01 (regras de distribuição — combinada com A1).

### A4 — Detalhe / Visão 360 do Registro (com abas)
Painel de detalhe de um registro com resumo no topo e abas/seções de contexto; funde várias vistas em abas para minimizar telas.

```wireframe
# Detalhe do Contribuinte
card "Resumo":
  [[ Documento | Segmento | Score ]]
(!) sinalização coercitiva ativa
## Abas: Débitos | Parcelamentos | Histórico | Interações
card "Conteúdo da aba":
  | Coluna | Coluna | Coluna |
  | linha | linha | linha |
[Ação contextual] [Registrar interação]
```
- **Quando usar:** consolidar tudo de um único registro (contribuinte/dossiê/caso) em uma tela com abas.
- **Componentes:** toolbar, card, tabs, table, list, banner, button.
- **Instâncias:** Cobrança Qualificada · T-CQ-03 (dossiê/caso); Ingestão · T-ING-03 (visão única — somente leitura).

### A5 — Editor de Fluxo / Linha do Tempo (canvas de etapas)
Editor visual sequencial de etapas com offsets temporais e ramificações condicionais; representa a régua e seu escalonamento (RN-05).

```wireframe
# Editor de Régua
[Nome da régua____] [Segmento alvo v]
card "Etapas (linha do tempo)":
  [[ -5d e-mail | -2d e-mail | 0d SMS | +15d WhatsApp ]]
  - condição: sem pagamento -> intensifica
  - condição: regularizou -> encerra
[Adicionar etapa] [Simular] [Ativar régua]
```
- **Quando usar:** desenhar sequência temporal/condicional de ações; NÃO usar para uma lista simples.
- **Componentes:** toolbar, input, select, card, chip, button.
- **Instâncias:** Réguas · T-REG-01.

### A6 — Painel de Status de Integração / Execução
Painel operacional de fontes/jobs: última sincronização, volume, erros, e ação de reprocessar (RNF-T-OBS-01, RNF-T-DISP-01).

```wireframe
# Integrações & Execução
[[ Fontes OK | Última sync | Pendências ]]
(!) falha em uma fonte
| Fonte | Última sync | Registros | Status |
| CCF | data | n | OK |
[Reprocessar] [Ver log]
```
- **Quando usar:** operar/monitorar integrações e jobs de lote.
- **Componentes:** toolbar, card, table, banner, button.
- **Instâncias:** Ingestão · T-ING-01; Scoring · T-SC-01; Réguas · T-REG-02 (status de disparo).

## Relacionado
- [Índice do wiki](index.md)
- [Visão do produto](visao.md)
- [Modelo de dados (transversal)](modelo-dados.md)
- [Requisitos transversais](requisitos-transversais.md)
- [Vocabulário de componentes](componentes.md)
