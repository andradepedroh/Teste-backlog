# vale-styles — lint de prosa para requisitos (estilo EngProc)

Estilos para o [Vale](https://vale.sh/) — linter de prosa distribuído como **binário único em Go**.
Usados pelas skills `spec-product` (Passo de verificação de prosa, gate `PROSE_LINTED`) e
`spec-iterate` (Fase 2 — varredura) para detectar linguagem vaga/não-testável em
`requirements.md`, `product-requirements.md` e demais artefatos de negócio.

## Regras

| Regra | Tipo (extension) | Level | O que detecta |
|-------|------------------|-------|---------------|
| `EngProc.Ambiguidade` | `existence` | warning | Termos vagos/não-testáveis (estilo NASA ARM, PT-BR): "adequado(a)", "apropriado(a)", "rápido/rapidamente", "fácil/facilmente", "amigável", "flexível", "robusto", "eficiente", "suficiente", "etc", "e/ou", "conforme necessário", "conforme apropriado", "se possível", "em tempo hábil", "o mais breve possível", "melhor esforço", "vários", "alguns", "diversos", "geralmente", "normalmente", "adequadamente" |
| `EngProc.PronomesVagos` | `existence` (scope `sentence`) | suggestion | "isso", "isto", "aquilo", "o mesmo", "tal" no **início de frase** (referente ambíguo) |
| `EngProc.EARS` | `conditional` (scope `raw`) | warning | Linha de critério de aceitação (`- CA-NN` / `CA-NN`) **sem** gatilho EARS PT-BR ("QUANDO/ENQUANTO/ONDE/SE … ENTÃO … o sistema DEVE" ou "O sistema DEVE") |

> `EngProc.Ambiguidade.yml` é a **fonte canônica do dicionário de termos**: no modo degradado
> (Vale ausente — `TOOL_UNAVAILABLE:vale` no sync-log), o agente lê o YAML e aplica a lista
> manualmente via revisão LLM, marcando os achados como `[lint-llm]`.

## Os 5 padrões EARS em PT-BR (referência de escrita)

Padrões que a regra `EngProc.EARS` espera nos critérios de aceitação — todos terminam
na cláusula **"o sistema DEVE"** (em caixa alta):

| # | Padrão | Sintaxe | Exemplo |
|---|--------|---------|---------|
| 1 | **Ubíquo** (sempre vale) | `O sistema DEVE <resposta>` | O sistema DEVE registrar toda exclusão em log de auditoria. |
| 2 | **Evento** (dirigido por gatilho) | `QUANDO <gatilho>, o sistema DEVE <resposta>` | QUANDO o boleto vencer, o sistema DEVE bloquear novos pedidos do cliente. |
| 3 | **Estado** (enquanto durar a condição) | `ENQUANTO <estado>, o sistema DEVE <resposta>` | ENQUANTO a integração estiver indisponível, o sistema DEVE enfileirar as solicitações. |
| 4 | **Comportamento indesejado** | `SE <condição indesejada>, ENTÃO o sistema DEVE <resposta>` | SE o gateway retornar erro, ENTÃO o sistema DEVE reverter a transação em até 30 min. |
| 5 | **Opcional** (feature condicionada) | `ONDE <feature/configuração>, o sistema DEVE <resposta>` | ONDE o módulo de cobrança estiver habilitado, o sistema DEVE exibir o painel de faturas. |

Regras de escrita: **um padrão por critério** (critério que precisa de dois padrões = dois
critérios); resposta com **resultado observável e mensurável** (valor, unidade, prazo ou
condição verificável — sem termos da lista de `EngProc.Ambiguidade`).

## Obter o Vale (verificar → rota efêmera → degradar)

Política em [`../references/tool-bootstrap.md`](../references/tool-bootstrap.md) — o agente **não
instala por conta própria**.

1. **Verificar:** `vale --version` (testado com Vale ≥ 3.x). Responde → usar direto.
2. **Rota efêmera** (não muta o ambiente, dispensa aprovação; registrar `TOOL_EPHEMERAL:vale (container)`):
   `docker run --rm -v "$PWD:/docs" jdkato/vale …`
3. **Degradar:** sem Vale e sem container → `TOOL_UNAVAILABLE:vale (motivo curto)` no `sync-log.md`
   e revisão manual dos padrões acima; nunca é gate FATAL.
4. **Instalação só como oferta, com aprovação registrada** (`TOOL_INSTALLED:vale (aprovado por
   <quem>, <comando>)`): binário da release <https://github.com/errata-ai/vale/releases> no `PATH` ·
   `brew install vale` (macOS) · `winget install errata-ai.Vale` (Windows).

## Uso no projeto

Passo a passo do gate `PROSE_LINTED` da `spec-product` (Passo 4.5) e da varredura da `spec-iterate`.
Saiu do `spec-product/SKILL.md` na Onda 4 do plano de melhoria das skills do harness
(2026-10-20) e substituiu a versão anterior desta seção, que divergia dele (`MinAlertLevel`,
«toda ocorrência corrigida»). A triagem 🟡/⚪ e o registro do gate continuam na `spec-product`.

1. Garantir um `.vale.ini` na raiz do projeto (criar se não existir). Os estilos são o pacote
   canônico `../tools/vale-styles` — esta pasta — (relativo ao SKILL.md de quem chama, como todo
   recurso de `tools/` — ver [`../references/paths.md`](../references/paths.md)). O
   `StylesPath` do Vale, porém, é resolvido **relativo ao próprio `.vale.ini`** (raiz do projeto),
   então **nunca** fixar `.cursor/…` às cegas: em projeto só-Claude esse caminho não existe, o Vale
   carrega zero regras e o gate fecha «limpo» sem ter lintado nada. **Descobrir o caminho, não presumir:**

   ```bash
   # resolver `../tools/vale-styles` no espelho de skills em uso neste projeto (o 1º que existir)
   ls -d .claude/skills/tools/vale-styles .cursor/skills/tools/vale-styles \
         plugin/skills/tools/vale-styles skills/tools/vale-styles 2>/dev/null | head -1
   ```

   ```ini
   StylesPath = <caminho resolvido acima>
   MinAlertLevel = warning

   [*.md]
   BasedOnStyles = EngProc
   ```

2. **Verificar que os estilos carregaram** (obrigatório — sem isto o gate dá falso verde):

   ```bash
   vale ls-config | grep -i "EngProc\|StylesPath"
   ```

   O pacote `EngProc` **tem** de aparecer em `Styles`/`BasedOnStyles`. Se não aparecer, o Vale roda
   com **zero regras** e reporta zero ocorrências — resultado **inválido**: corrigir o `StylesPath`
   e repetir. **Nunca** aceitar «0 ocorrências» sem esta confirmação. Persistindo a falha, tratar como
   ferramenta indisponível (modo degradado abaixo), **não** como texto limpo.

3. Rodar:

   ```bash
   vale outputs/spec/requirements/requirements.md outputs/spec/product-requirements/product-requirements.md
   ```

**Modo degradado (Vale ausente):** seguir a política de
[`../references/tool-bootstrap.md`](../references/tool-bootstrap.md) — **verificar
(`vale --version`) → rota efêmera → degradar**. Rota efêmera do Vale: container
`docker run --rm -v "$PWD:/docs" -w /docs jdkato/vale <arquivos>` (não muta o ambiente, dispensa
aprovação; exige que o `StylesPath` esteja acessível dentro do volume montado). Sem rota efêmera
disponível, registrar `TOOL_UNAVAILABLE:vale (motivo curto)` no `sync-log.md` e fazer a
revisão via LLM usando **o mesmo dicionário**: ler
[`EngProc/Ambiguidade.yml`](EngProc/Ambiguidade.yml)
(fonte canônica da lista de termos) e aplicar os padrões manualmente sobre os dois artefatos **com a
mesma triagem 🟡/⚪ do Passo 4.5 da `spec-product`**, marcando cada achado com `[lint-llm]` no relato ao consultor.
Registrar o gate com `modo=llm`. Instalação permanente (`brew install vale`, `winget install errata-ai.Vale`,
binário do release) só é **oferecida** ao consultor e executada com aprovação registrada
(`TOOL_INSTALLED:vale`) — nunca por iniciativa do agente.

## Limitações conhecidas

1. **`EngProc.EARS` não faz "negative match" puro.** O Vale usa Go RE2 (sem lookaround), então
   a regra é implementada como `conditional`: cada identificador `CA-NN` capturado precisa
   aparecer em alguma linha que contenha `o sistema DEVE`. Consequências:
   - Critérios **sem identificador numerado** (ex.: `- CA: quando…`) não são verificados —
     numerar os CAs (`CA-01`, `CA-02`, …) é pré-requisito da regra.
   - A regra verifica a presença de **"o sistema DEVE"** (comum aos 5 gatilhos EARS), não a
     estrutura completa `QUANDO/ENQUANTO/SE…ENTÃO/ONDE` — a conformidade estrutural fina
     continua sendo responsabilidade da revisão (validator `RF_EARS_PATTERN` da `spec-product`).
   - `DEVE` precisa estar em **caixa alta** (convenção da metodologia); `deve` minúsculo é
     apontado como violação.
   - Se o **mesmo** `CA-NN` aparecer duas vezes (uma linha com DEVE, outra sem), a linha sem
     DEVE não é apontada (a correspondência é por identificador, não por linha).
2. **"eficiente"/"suficiente" sem métrica:** o Vale não distingue ocorrências acompanhadas de
   métrica — toda ocorrência é apontada (warning); ocorrências com métrica explícita são
   justificadas, não corrigidas.
3. `EngProc.PronomesVagos` usa a segmentação de sentenças do Vale; em listas/tabelas markdown
   a detecção de "início de frase" pode variar — por isso o level é `suggestion`.

## Validação dos YAML

Após qualquer edição nas regras (rodar **a partir desta pasta**, `tools/vale-styles/` — o glob é
relativo a ela, então funciona nos 3 espelhos: `skills/`, `.cursor/skills/`, `plugin/skills/`):

```bash
python3 -c "import yaml,glob; [yaml.safe_load(open(f, encoding='utf-8')) for f in glob.glob('EngProc/*.yml')]; print('ok')"
```

(ou `vale ls-vars` / rodar `vale` sobre um arquivo de teste — o Vale falha com mensagem clara
se a sintaxe da regra estiver inválida).
