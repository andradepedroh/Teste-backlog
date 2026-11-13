# spec-requirements-depth — profundidade e sintaxe de requisitos

> Referência normativa para o spec-product (Passo 3.1) e spec-iterate. Define COMO escrever RF e RNF com método nomeado, procedimento embutido e critério de aceitação. Resolve §2.2 (arquivo fantasma) e §4.2.4/§4.2.5 (métodos).

## 1. Teste de granularidade de RF (aplicar antes de detalhar)

Um RF passa se, e só se:

1. o PO consegue aceitá-lo **sem mencionar implementação**;
2. tem **exatamente 1 resultado observável**;
3. seus cenários BDD cabem em **≤ 12 linhas Gherkin**.

Se falhar qualquer critério → **dividir** o RF.

## 2. Sintaxe EARS (Easy Approach to Requirements Syntax)

Todo RF usa **exatamente 1** dos 5 padrões. RF que precisa de 2 padrões = 2 RFs.

| Padrão | Template | Exemplo |
|---|---|---|
| Ubíquo | O sistema deve `<resposta>` | "O sistema deve registrar toda doação com data e valor" |
| Dirigido a evento | QUANDO `<gatilho>`, o sistema deve `<resposta>` | "QUANDO o upload concluir, o sistema deve emitir o protocolo" |
| Dirigido a estado | ENQUANTO `<estado>`, o sistema deve `<resposta>` | "ENQUANTO o cadastro estiver pendente, o sistema deve bloquear a emissão" |
| Comportamento indesejado | SE `<condição de falha>`, ENTÃO o sistema deve `<resposta>` | "SE o CPF for inválido, ENTÃO o sistema deve rejeitar com mensagem específica" |
| Opcional | ONDE `<feature presente>`, o sistema deve `<resposta>` | "ONDE houver integração X, o sistema deve sincronizar a cada 24h" |

Validators: `RF_SINGULAR` (FATAL: RF com dois resultados observáveis distintos), `RF_EARS_PATTERN` (WARNING: RF fora dos 5 padrões).

## 3. Checklist de qualidade ISO/IEC/IEEE 29148 (por RF)

Cada RF deve ser: **necessário · não ambíguo · completo · singular · viável · verificável · rastreável**.

- ❌ "O sistema deve ser fácil de usar e rápido" (não singular, não verificável).
- ✅ "QUANDO o usuário submeter o formulário válido, o sistema deve persistir o registro e exibir confirmação em ≤ 2s (p95)" (1 EARS + medida).

## 4. RNF — Quality Attribute Scenarios (SEI) + ISO/IEC 25010

Todo RNF em cenário de 6 partes: `{fonte do estímulo, estímulo, ambiente, artefato, resposta, medida da resposta}`, categorizado por ISO 25010 (desempenho, segurança, usabilidade, confiabilidade, manutenibilidade, portabilidade, compatibilidade, adequação funcional).

- ❌ "O sistema deve ser rápido".
- ✅ "Usuário autenticado (fonte) submete consulta de extrato (estímulo) em horário de pico com 200 usuários simultâneos (ambiente) → o módulo de consulta (artefato) retorna a página (resposta) com p95 ≤ 2s (medida)".

Validator `RNF_HAS_MEASURE` (**FATAL**: RNF sem medida numérica na parte "resposta").

## 5. Taxonomia de regras de negócio (BRG / von Halle) — §4.2.6

Classificar cada RN-xxx numa coluna "Tipo":

| Tipo | Definição |
|---|---|
| Fato | Verdade sempre válida do domínio |
| Restrição | Proíbe/limita um estado ou ação |
| Derivação (cálculo) | Deriva um valor a partir de outros |
| Inferência | Conclui um fato a partir de condições |
| Gatilho (ação) | Dispara uma ação quando uma condição ocorre |

Regra: RN tipo **Derivação exige campo "Algoritmo" em passos numerados** — é o que o spec-tasks consome em `businessRules[].implementation.algorithm[]` e o spec-estimate usa em `ruleComplexity`. Validator `RN_DERIVATION_HAS_ALGORITHM` (FATAL).

## 6. Priorização MoSCoW com critério objetivo (§4.2.3)

| Nível | Critério objetivo |
|---|---|
| Must | a jornada crítica de uma persona primária **não completa** sem ele, OU é obrigação normativa (RN com fonte legal) |
| Should | valor alto (liga a KR/NSM) mas a jornada completa sem ele |
| Could | conveniência sem ligação direta a KR |
| Won't (agora) | registrado na seção "Não é" da visão |

Cada Must cita a jornada ou RN que o justifica. Banda `MUST_INFLATION` (WARNING): Must > 50% dos RFs do módulo → revisar critérios.

## 7. Bandas operacionais do spec-product (§4.2.9)

| Métrica | 🟢 | 🟡 | 🔴 |
|---|---|---|---|
| % de RFs Must por módulo | ≤ 35% | 36-50% | > 50% |
| Personas primárias | 2-3 | 4-5 | > 5 |
| KRs por objetivo | 2-3 | 4 | > 4 |
| Job stories por persona (com F-xxx) | 2-5 | 1 | 0 (hipotética) |
| RNF com medida completa (6 partes) | 100% | ≥ 80% | < 80% |
| RN Derivação com algoritmo | 100% | — | < 100% (FATAL) |
