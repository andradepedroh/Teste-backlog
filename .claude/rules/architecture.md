---
description: "Arquitetura da aplicação escopada x_cbi_ da Cobrança Inteligente no ServiceNow: camadas, módulos e onde cada tipo de lógica mora"
alwaysApply: false
paths: **/*.js, **/*.xml
---

# Arquitetura — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

> Decisões **obrigatórias**. Conflito com outra rule → **esta prevalece** até alteração explícita.
> Ver **conventions.mdc** para idioma e nomenclatura.

---

## Estilo Arquitetural

**Monolito simples na plataforma ServiceNow** — uma única aplicação escopada (`x_cbi_`) no App
Engine, publicada como um pacote só. Os 7 módulos de negócio são separações lógicas (menus,
tabelas e Script Includes), não artefatos implantados separadamente. Fonte: ETF §1.1 e o quadro
técnico confirmado por Pedro em 2026-11-13 (item 2.1).

**Por que:** a ETF prevê uma aplicação escopada com telas nativas; dividir em várias aplicações
criaria dependência entre escopos sem ganho para um único time.

---

## Padrão Interno — camadas da plataforma

O código segue três camadas. Quebrar a ordem espalha regra de negócio por gatilhos difíceis de
testar e de auditar.

| Camada | Objetos ServiceNow | Responsabilidade |
|--------|--------------------|------------------|
| Entrada | Scripted REST API, UI Action, Flow Designer (gatilho) | Recebe a requisição ou o evento, valida o formato e chama a regra |
| Regras | Script Include (um por responsabilidade) | Toda regra de negócio e todo cálculo (consolidação, critérios, motor de réguas, prioridade, origem da regularização) |
| Dados | Tabelas `x_cbi_*`, GlideRecord / GlideAggregate | Gravação e leitura; ACL e Query Business Rule protegem o acesso |

**MUST:**
- Regra de negócio mora em **Script Include**. Business Rule só **dispara** a regra (chama o Script Include), nunca a contém por inteiro.
- Scripted REST API não acessa tabela direto para regra de negócio: chama o Script Include da regra.
- Processamento agendado (fechamento do ciclo, motor de réguas, atualização intraciclo) roda em **Scheduled Job** ou **Flow Designer** que chama Script Include.

**MUST NOT:**
- Client Script com regra de negócio (a regra precisa valer também para APIs e jobs).
- Lógica duplicada em dois Script Includes: extrair para um terceiro compartilhado.

---

## Módulos

Os módulos espelham `outputs/spec/modules.md`. Cada Script Include, tabela e menu pertence a um só.

| Módulo | Prefixo de Script Include | Tabelas principais |
|--------|---------------------------|--------------------|
| MOD-INGESTAO | `Ingestao*`, `ApiIngestaoBase`, `ValidadorDocumento`, `ConsolidadorContribuinte` | `x_cbi_fonte`, `x_cbi_sync_execucao`, `x_cbi_registro_rejeitado`, `x_cbi_contribuinte`, `x_cbi_debito`, `x_cbi_posicao_tributo`, `x_cbi_parcelamento`, `x_cbi_vinculo_economico`, `x_cbi_sinalizacao` |
| MOD-QUALIFICACAO | `Qualificacao*` | `x_cbi_criterio_versao`, `x_cbi_carteira`, `x_cbi_carteira_item` |
| MOD-SCORE | `Score*` | `x_cbi_score`, `x_cbi_score_faixa` |
| MOD-REGUAS | `Regua*`, `EnvioCanal*` | `x_cbi_regua`, `x_cbi_regua_etapa`, `x_cbi_template`, `x_cbi_consentimento`, `x_cbi_comunicacao` |
| MOD-QUALIFICADA | `Caso*` | `x_cbi_caso` (estende `task`), `x_cbi_interacao`, `x_cbi_followup` |
| MOD-MONITORAMENTO | `Monitoramento*` | `x_cbi_regularizacao`, `x_cbi_meta` |
| MOD-GOVERNANCA | `Governanca*`, `Auditoria*` | `x_cbi_parametro`, `x_cbi_auditoria_evento` |

**Dependência entre módulos:** um módulo chama outro **só** pelo Script Include público dele
(ex.: Réguas chama `QualificacaoCarteira.itensMassificada()`), nunca gravando direto na tabela do
outro. Exceção registrada: a ingestão grava as tabelas de origem, e só ela (RN-NOVO-ING-008).

---

## Anti-padrões

- Business Rule de 200 linhas com regra de negócio dentro.
- Script Include «Utils» genérico que mistura regras de módulos diferentes.
- Consulta GlideRecord dentro de laço sobre milhares de registros (usar consulta única ou GlideAggregate).
- Regra que só existe na tela (UI Policy) e não vale para a API.
- Alteração direta em tabela de outro módulo.
