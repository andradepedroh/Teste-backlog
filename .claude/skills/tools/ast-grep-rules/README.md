# ast-grep-rules — mineração de regras de negócio em código legado

Catálogo de **12 regras** para o [ast-grep](https://ast-grep.github.io/) (`sg scan`) minerarem **candidatos a regra de negócio** em código legado. Cada arquivo `.yml` contém um conceito, com variantes `-js` (JavaScript) e `-py` (Python) separadas por `---`. Severidade sempre `hint`: são **candidatos com alto recall** — o modelo interpreta cada achado, descarta falsos positivos e redige as `RN-xxx`.

## Uso

O `sgconfig.yml` desta pasta é **versionado** — não criar nada na hora:

```bash
# rota efêmera preferida (não muta o ambiente):
npx --yes -p @ast-grep/cli ast-grep scan \
  --config skills/tools/ast-grep-rules/sgconfig.yml --json src/ \
  > outputs/spec/signals/rules-candidates.json

# com o binário já disponível no PATH:
sg scan --config skills/tools/ast-grep-rules/sgconfig.yml --json src/ \
  > outputs/spec/signals/rules-candidates.json
```

Trocar o prefixo por `.cursor/`, `.claude/` ou `plugin/` conforme o espelho em uso — os
caminhos do `sgconfig.yml` são **relativos ao próprio arquivo**, então o mesmo config
funciona em todos os espelhos e a partir de qualquer diretório de trabalho.

> Em algumas distribuições o binário chama-se `ast-grep` (o alias `sg` pode colidir com o `sg` do shadow-utils no Linux) — usar `ast-grep scan ...` nesse caso.
> Instalação global (`npm i -g @ast-grep/cli` / `pip install ast-grep-cli`) só com aprovação explícita do usuário — ver [`../references/tool-bootstrap.md`](../references/tool-bootstrap.md).

O JSON traz, por achado: `ruleId`, `file`, `range` (linha/coluna), `text` e `message`. Esse resultado **alimenta a redação das RN-xxx** (Dimensão 8 do `legacy.md`): cada regra redigida cita a evidência `arquivo:linha` vinda do ast-grep, em vez de impressão de leitura.

## As 12 regras

O `sgconfig.yml` lista os 12 arquivos **um a um** (24 regras contando as variantes `-js`/`-py`).
Não usar `ruleDirs: [.]`: o ast-grep leria o próprio `sgconfig.yml` como regra e abortaria
com `missing field 'language'`. Ao acrescentar uma regra, incluir o arquivo no `sgconfig.yml`
**e** nesta tabela.

| # | Arquivo | O que caça |
|---|---------|-----------|
| 1 | `status-string-comparison.yml` | comparação de `status`/`estado` com string literal |
| 2 | `percentage-decimal-calculation.yml` | cálculo com percentual / constante decimal |
| 3 | `hardcoded-numeric-threshold.yml` | limites numéricos hardcoded em condicionais |
| 4 | `document-validation.yml` | validação de documento (CPF/CNPJ/regex de formato) |
| 5 | `state-transition-assignment.yml` | transição de estado (atribuição a `.status`/`.state`) |
| 6 | `hardcoded-date-deadline.yml` | datas/prazos hardcoded |
| 7 | `switch-on-type-category.yml` | switch/match sobre tipo ou categoria |
| 8 | `conditional-discount-surcharge.yml` | desconto/acréscimo/juros condicionais |
| 9 | `monetary-rounding.yml` | arredondamento monetário (round/toFixed/Decimal) |
| 10 | `eligibility-rule.yml` | elegibilidade (if idade/valor/perfil) |
| 11 | `business-error-message.yml` | throw/raise com mensagem de regra de negócio |
| 12 | `hardcoded-feature-flag.yml` | flags/feature toggles hardcoded |

## Outras linguagens

Para TypeScript/TSX, duplicar a variante `-js` trocando `language: javascript` por `typescript`/`tsx` (padrões são compatíveis). Para Java/C#/Go, adaptar os `pattern` mantendo `constraints`/`regex` — os vocábulos de negócio são os mesmos.

## Indisponibilidade

Se o `sg` não estiver disponível e não houver rota efêmera possível (sem rede para o `npx`)
nem aprovação para instalar, registrar `TOOL_UNAVAILABLE:ast-grep` no sync-log e minerar as mesmas 12 categorias via leitura/LLM, marcando as RN resultantes como `[sem varredura determinística]` — ver Passo 0.7 do `spec-legacy`.
