---
name: spec-report
description: >
  spec-report (Documentação) — compila os artefatos de outputs/spec/ num único HTML autocontido, navegável
  por DOMÍNIOS (menu superior fixo + sidebar contextual + hash routing #dominio/ancora): Visão Geral (capa +
  sumário executivo + cobertura do flow-map), Documentos (capítulos clássicos), Fluxos & Telas (flow-map.md
  via check-flowmap.py, diagramas Mermaid gerados, screenshots embutidos em base64), Técnico (data-model.json
  + SVG de ER + referência a api-contracts.yaml + tech-rules/tech-rules-summary.md), Revisão (revisao.json do
  harness Elo v2) e Qualidade & GAPs (gaps.md + sync-log.md). Domínios só
  aparecem se houver artefato; sem flow-map o domínio Fluxos & Telas não aparece, mas a landing continua
  sendo Visão Geral (capa + resumo executivo). Exclui prototype.md, frontend-decisions.md e src/.
version: "3.2"
updated: "2026-10-20"
---

> **Versão única do layout (3.0):** templates (`data-shell-version`, stamp do CSS) e
> `tools/generate-report.py` (`REPORT_VERSION`) sobem **em conjunto**, e só em mudança
> **incompatível** — o script aborta com exit 1 se os templates estiverem defasados
> (`TEMPLATE_VERSION_MATCH`). O `version` do frontmatter desta SKILL é outro contrato: ele
> sobe a cada edição da skill, mesmo quando shell/CSS/gerador ficam compatíveis — foi o caso do
> domínio Revisão (skill 3.1, layout 3.0). Detalhes em [`./MAINTENANCE.md`](./MAINTENANCE.md).

# spec-report — Kit HTML da Documentação de Discovery

## Sync-log (obrigatório)

Antes de iniciar, ler `outputs/spec/sync-log.md` Seção A — útil para popular o sumário executivo da capa (decisões-chave já registradas resumem o projeto). Ao terminar, adicionar linha registrando geração do HTML e versão produzida. Regras gerais em [`spec/SKILL.md`](../spec/SKILL.md) seção «Sync-log como memória cross-cutting».

## Papel

Produzir **um arquivo HTML único e autocontido** que sirva de **entrega legível** — stakeholders, arquivo, impressão — com **todo o conteúdo documental** gerado pelo fluxo `spec`.

Inclui **sumário executivo gerado** na capa e **capítulo de Conclusões e Próximos Passos** — não é só compilação de docs, é uma entrega com narrativa executiva.

**Regra de ouro:** o HTML deve refletir a **estrutura semântica** dos artefatos e ter um **índice navegável** por capítulo. Não é dump de texto.

## Linguagem clara — como escrever o que o humano vai ler (OBRIGATÓRIO)

<!-- linguagem-clara:v1 inicio -->
<!-- Bloco canônico. Ao alterar, rodar `python scripts/apply_linguagem_clara.py` para replicar em todas as skills. -->

**Quem lê não é você.** É o desenvolvedor que pegou a task sem ter participado do discovery, o PO
que precisa aprovar, o analista que entrou no time semana passada. Texto correto e ilegível custa
uma reunião — e quem lê desiste e vai perguntar. Escrever difícil não é sinal de rigor: é defeito de
geração, do mesmo peso de um campo obrigatório faltando.

**Alvo verificável:** uma pessoa que nunca viu este projeto entende o que precisa fazer **lendo uma
vez**, sem abrir outro documento e sem precisar procurar o significado de nenhuma palavra.

### As 10 regras

1. **Frase curta, voz ativa, presente.** "O serviço confere o CPF antes de gravar" — não "a
   validação do CPF é realizada previamente à persistência". Alvo: até ~25 palavras por frase, uma
   ideia por frase.
2. **Termo técnico ganha explicação de meia linha na primeira aparição:** "no repository (a classe
   que conversa com o banco)", "um índice único (o banco passa a recusar duplicados sozinho)". Da
   segunda vez em diante, usar o termo puro.
3. **Nenhuma sigla solta.** Expandir na primeira aparição — inclusive as siglas do negócio e as da
   própria metodologia: "IDOR (quando um usuário consegue acessar o registro de outro)",
   "DV (Documento de Visão)", "RN (Regra de Negócio)".
4. **Código de regra ou de requisito nunca substitui o conteúdo dela.** Escrever a regra por extenso
   e pôr o código no fim, entre parênteses: "não deixa cadastrar dois clientes com o mesmo CPF
   (RN-012)". "Implementar a RN-012" não informa nada a quem não tem o documento aberto.
5. **Nome de arquivo, tabela, rota ou classe sempre acompanhado do papel dele.**
   `PedidoService.java` sozinho não diz nada; `PedidoService.java — onde ficam as regras de quando
   um pedido pode ser aprovado` diz. Vale igual para `TB_PEDIDO` e para `POST /pedidos`.
6. **Sem jargão de processo.** "blueprint", "gate", "FATAL", "matriz de cenários", "compact-prose",
   nome de validator, nome de camada de arquitetura: isso é vocabulário interno das skills, não do
   leitor. Traduzir — em vez de "6 cenários da matriz em VERDE", escrever "testei 6 situações, todas
   passaram".
7. **Sem "simplesmente", "basta", "apenas", "trivial", "é só".** Minimizam a dificuldade e afastam
   quem não entendeu de primeira.
8. **Verbo no lugar de substantivo; ativa no lugar de passiva.** "realizar a validação" → "validar";
   "efetuar o cadastramento" → "cadastrar"; "é disponibilizado ao usuário" → "o sistema mostra";
   "deve ser efetuada a persistência" → "grava no banco".
9. **Cenário de teste é uma frase "quando X, o sistema Y"** — nunca o id do cenário, nunca o nome do
   método de teste: "quando o CPF já existe, o sistema recusa e mostra 'CPF já cadastrado'".
10. **Bloco técnico denso abre com uma frase em português dizendo o que ele significa.** Contrato de
    API, colunas de tabela, status HTTP, schema, JSON: o conteúdo continua **completo e preciso** —
    o que muda é que antes dele vem uma linha do tipo "esta rota cria o pedido e devolve o número
    dele; se o CPF não existir, recusa com 404". Precisão técnica e legibilidade não competem: a
    frase de abertura é o mapa, o bloco é o território.

### Antes → depois (referência de tom)

| Complexo (não usar) | Claro (usar) |
|---|---|
| "Implementar validação de unicidade conforme RN-012, com persistência idempotente." | "Impedir o cadastro de dois clientes com o mesmo CPF. Se o CPF já existir, o sistema recusa e mostra 'CPF já cadastrado' — nada é gravado. Se a mesma requisição chegar duas vezes, o resultado é o mesmo da primeira (RN-012)." |
| "A entidade é submetida ao processo de normalização previamente à sua persistência." | "Antes de gravar, o sistema padroniza os dados: tira acento, deixa em maiúscula e remove espaço sobrando." |
| "Realizar o tratamento de exceções no fluxo de integração." | "Se o sistema externo não responder, tentar mais 2 vezes. Se ainda falhar, guardar a solicitação na fila e avisar o usuário que o processamento termina depois." |
| "Garantir a aderência aos padrões arquiteturais definidos." | "Seguir o padrão do projeto: a tela nunca fala direto com o banco, sempre passa pelo serviço." |
| "Disponibilizar endpoint para consulta paginada de pedidos com filtros." | "Criar a busca de pedidos: quem chama informa a página e pode filtrar por cliente, período e situação. A resposta traz 20 pedidos por vez e o total encontrado." |
| "Efetuar refatoração do componente visando redução do acoplamento." | "Separar o componente em dois, para que mudar a regra de desconto deixe de exigir mexer na tela." |

### Como conferir antes de entregar (30 segundos)

1. Leia em voz alta a **primeira frase de cada seção**. Travou a língua? Reescreva.
2. Existe alguma palavra que um analista de primeiro emprego **não usaria numa conversa**? Troque, ou
   explique entre parênteses na primeira aparição.
3. Alguma frase obriga a abrir outro documento para fazer sentido — sigla, código de regra, nome de
   arquivo sem o papel dele? Complete ali mesmo.
4. Algum bloco técnico começa direto no JSON, na tabela ou no YAML? Ponha a frase de abertura.

> **Isto não autoriza cortar conteúdo.** Nenhuma das regras acima permite resumir, omitir campo
> obrigatório ou trocar dado concreto por prosa. Linguagem clara é sobre a **forma**; densidade,
> precisão e auto-suficiência continuam sendo sobre o **conteúdo**. As duas coisas valem juntas.

<!-- linguagem-clara:v1 fim -->

### Aplicação nesta skill

Vale para a capa, para os textos de ligação entre domínios e para qualquer texto que a skill escreva no HTML. O leitor é stakeholder: se uma seção só faz sentido para quem acompanhou o discovery, ela precisa de um parágrafo de contexto antes.

## Domínios do relatório (layout v3.0)

O script monta o HTML em domínios — Visão Geral, Documentos, Fluxos & Telas, Técnico, Revisão e
Qualidade & GAPs. A tabela de domínios, os insumos e o carregamento do Mermaid estão no
[`./MAINTENANCE.md`](./MAINTENANCE.md) § «O que o gerador já implementa»: ler ao mexer no gerador ou
ao explicar por que um domínio não apareceu.

**Degradação limpa** — o comportamento fino está nos validators WARNING abaixo; as quatro regras semânticas que não podem se perder:
- A landing é **sempre Visão Geral** — flow-map ausente/inválido não muda a landing nem quebra o build.
- **Nunca** acusar o `flow-map.md` de erro de gramática quando o problema é a ferramenta (`TOOL_MISSING`/`TOOL_TIMEOUT`/`TOOL_ERROR`/`TOOL_OUTPUT_INVALID`).
- Sem `## Amarração Técnica` no flow-map → saída **idêntica** ao comportamento anterior (sem chips/índice reverso/%).
- **Template defasado** é o único caso que aborta (exit 1, nada gravado) — ver `TEMPLATE_VERSION_MATCH`.

### Cenários de degradação (só manutenção)

**Ao mexer no gerador, nos templates ou no `check-flowmap.py`** — nunca na geração normal de um
relatório —, reproduzir os **cinco cenários de degradação** documentados em
[`./MAINTENANCE.md`](./MAINTENANCE.md) com fixtures temporárias fora do repositório.

**DICA DE PRODUTIVIDADE (ECONOMIA DE TOKENS):** Em vez de tentar ler todos os MDs e gerar um HTML massivo na unha (o que vai causar truncation e estourar o limite de tokens), você **DEVE OBRIGATORIAMENTE** executar `python3 ../tools/generate-report.py` no terminal (forma canônica relativa ao SKILL.md — ver [`references/paths.md`](../tools/references/paths.md)). Este script já implementa todas as regras de exclusão, leitura cruzada e injeção do template CSS definidos abaixo.

**FLUXO PRONTO (mínimo de tokens):**
1. Basta rodar `python3 ../tools/generate-report.py`. O script é **autossuficiente**: gera um **Resumo executivo** automático (contagem de módulos, RF, RNF, RN e lacunas) direto dos artefatos e monta a capa a partir do nome do projeto — **não é preciso escrever HTML nem `capa.md` à mão**. Os templates são **descobertos** no espelho ativo (`spec-report/templates/` em `.cursor/skills/`, `.claude/skills/`, `plugin/skills/`, `skills/`, nessa ordem; por fim o diretório irmão do próprio script) — `--templates-dir` só é necessário para apontar outro lugar.
2. `outputs/spec/capa.md` é **opcional**. Se existir e estiver preenchida (não-stub, ≥ 200 caracteres), vira o capítulo "Capa & Sumário" com o texto do consultor. Se ausente/stub, o script segue normalmente usando só o resumo executivo automático (emite um aviso, não aborta).
3. Avisar o usuário com o caminho do HTML gerado.

> Quando quiser um sumário executivo **curado** (top 3 achados + posicionamento + top 3 GAPs redigidos pelo consultor), gere `capa.md` conforme os Passos 2–3 abaixo antes de rodar o script. Caso contrário, o resumo automático já entrega um panorama utilizável.

### Legibilidade no HTML (stakeholder)

O gerador **não remove** rastreabilidade dos `.md`, mas **reduz o ruído visual**: tabelas
grandes/de rastreabilidade viram `<details>` fechados (com botões Expandir/Recolher todas por
capítulo); tabelas-resumo ficam sempre visíveis. Quem precisa da rastreabilidade completa abre
as dobras ou usa os `.md` fonte.

---

## Exclusões explícitas

| Excluir | Motivo |
|---------|--------|
| `outputs/spec/prototype.md` | Protótipo/código fora deste kit |
| `outputs/spec/frontend-decisions.md` | Satélite do protótipo |
| `outputs/spec/gaps-answers.md` | Documento interno de trabalho |
| Qualquer arquivo sob `src/` | Código |
| Pastas `inputs/`, `.cursor/`, `deprecated/` | Fora do pacote |

---

## Estrutura do Documento

**Ordem dos capítulos do domínio Documentos** — implementada em **[`tools/generate-report.py`](../tools/generate-report.py)** (lista `files` em `main()`); a sidebar por grupos é gerada dinamicamente (sem links órfãos). A tabela abaixo é a **fonte de verdade documental**; se o script mudar, atualizar aqui também. Exceção: **`capa.md` (capítulo 1, `chapter-cover`) é renderizada no domínio Visão Geral** — a sidebar de Documentos aponta para `#visao/chapter-cover`.

O pivot por módulo e a tabela dos capítulos 1–14 estão no [`./MAINTENANCE.md`](./MAINTENANCE.md)
§ «O que o gerador já implementa» — ler ao mexer no gerador.

Se um arquivo não existir: omitir o capítulo e registrar na capa *«Artefatos omitidos: …»*.
Se uma Parte inteira não tiver arquivos: omitir o título do grupo no índice.

---

## Passo 1 — Inventário

O inventário (listar `.md`, aplicar exclusões, extrair nome do projeto, notar `prototype.md`)
é feito pelo **script** — nada a fazer manualmente além de conferir os avisos que ele imprimir.

---

## Passos 2–3 — Gerar Capa (sumário executivo + conclusões) em `capa.md`

A capa é **gerada pelo agente** — não é só metadados. Todo o conteúdo (metadados, sumário
executivo e Conclusões e Próximos Passos) é gravado num **único arquivo físico**,
`outputs/spec/capa.md` — não existe capítulo HTML separado para conclusões; o script renderiza
`capa.md` inteiro no capítulo `chapter-cover`.

**A estrutura canônica é o esqueleto [`templates/capa.md`](templates/capa.md)** — preencher todas
as seções dele. O que é geração (não cópia):

- **Sumário executivo** — sintetizar, não copiar parágrafos: top 3 achados de negócio (dores mais
  críticas do discovery + legacy, com dado quantificado quando existir), posicionamento
  recomendado (benchmark.md Passo 8) e top 3 GAPs críticos abertos (gaps.md CRÍTICA/ALTA).
- **`## Conclusões e Próximos Passos`** — gerado pelo agente, não copiado: o que foi descoberto,
  o que o produto vai ser, premissas aceitas, riscos identificados e a tabela de próximos passos.

---

## Passo 4 — Rodar o script

Com `capa.md` pronto (Passos 2-3), rodar `python3 ../tools/generate-report.py`. Ele lê a lista de arquivos, converte Markdown → HTML semântico, monta o pivot por módulo, injeta o CSS embutido e grava `outputs/spec/report/product-discovery-kit.html`. Avisar o usuário com o caminho gerado.

## Fallback manual (só se o script não rodar)

Só se o `generate-report.py` falhar e não houver tempo hábil para corrigir o script: seguir o
fallback manual do [`./MAINTENANCE.md`](./MAINTENANCE.md) § «O que o gerador já implementa», marcar
o HTML com `⚠️ REPORT-MANUAL` no rodapé e registrar no `sync-log.md`.

---

## Saída

| Arquivo | Template |
|----------|----------|
| `outputs/spec/capa.md` | [`templates/capa.md`](templates/capa.md) — gerado pelo agente **antes** de rodar o script (Passos 2–3) |
| `outputs/spec/report/product-discovery-kit.html` | [`templates/report-shell.html`](templates/report-shell.html) + [`templates/report-embedded.css`](templates/report-embedded.css) |

---

## Definição de pronto

A estrutura do HTML (domínios, sidebar, exclusões, placeholders, degradações) é garantida pelos
**gates do próprio script** — validators abaixo. O que o agente confere além deles:

- [ ] `generate-report.py` executado com **exit 0** e caminho do HTML informado ao usuário
- [ ] `capa.md` gerado conforme [`templates/capa.md`](templates/capa.md): sumário executivo (top 3 achados + posicionamento + top 3 GAPs críticos) + `## Conclusões e Próximos Passos`
- [ ] **Ao mexer no gerador/templates/check-flowmap.py** (nunca na geração normal): os 5 cenários de degradação do [`./MAINTENANCE.md`](./MAINTENANCE.md) reproduzidos com fixture temporária
- [ ] **Sync-log atualizado:** linha na Seção A com versão do HTML gerado e principais GAPs abertos como decisões pendentes

---

## Validators (FATAL / WARNING)

> **Regra desta seção:** nenhum gate é declarado FATAL sem implementação no
> `generate-report.py` (função entre parênteses no fim de cada verificação). Gate em prosa,
> auto-avaliado pelo agente, não é gate.

### FATAL — bloqueia a geração do HTML (verificado pelo script)

> **Cobertura:** os 6 `sys.exit(1)` do `generate-report.py` mapeiam nos 5 códigos abaixo —
> nenhuma saída não-zero fica sem código documentado. Os gates do gêmeo
> `generate-legacy-report.py` (kit AS-IS da `spec-legacy`) estão em [`./MAINTENANCE.md`](./MAINTENANCE.md).

| Código | Verificação |
|--------|-------------|
| `MARKDOWN_AVAILABLE` | O pacote `markdown` (markdown-py) importável. Ausente → **exit 1** com a ordem de bootstrap de `../tools/references/tool-bootstrap.md`; sem aprovação de instalação, registrar `TOOL_UNAVAILABLE:markdown-py` no `sync-log.md` e usar o Fallback manual *(`try: import markdown`)* |
| `TEMPLATES_MIRROR_FOUND` | Sem `--templates-dir`, existe pelo menos um espelho **compatível** com `spec-report/templates/` (cada candidato é inspecionado; o primeiro compatível vence). Nenhum serve → **exit 1** listando caminho e motivo em `stderr` *(`discover_templates_dir()`)* |
| `TEMPLATE_VERSION_MATCH` | Shell declara `data-shell-version="3.0"`, CSS traz `report-embedded v3.0` e ambos contêm os placeholders/seletores exigidos. Falha → **exit 1** com instrução de atualizar o pacote de skills *(`abort_incompatible_templates()`)* |
| `NO_PLACEHOLDER_LEFT` | HTML final sem nenhum placeholder literal e com pelo menos um `data-domain=` — a rede contra o defeito histórico «HTML vazio com exit 0» *(`assert_no_placeholder_left()`)* |
| `EXCLUSIONS_RESPECTED` | `prototype.md`, `frontend-decisions.md`, `gaps-answers.md` e `src/` **não** entram no HTML — asserção que impede um `append` futuro de furar a exclusão em silêncio *(`assert_exclusions_respected(files)`)* |

### WARNING — não bloqueia; anotar na capa ou no rodapé do HTML

| Código | Verificação |
|--------|-------------|
| `CAPA_EXISTS_AND_FILLED` | `capa.md` é **opcional** — existindo sem stub e com ≥ 200 caracteres, vira o capítulo "Capa & Sumário"; ausente/stub → aviso + resumo executivo automático, sem abortar |
| `CAPA_HAS_CONCLUSIONS` | `capa.md` preenchida deve trazer `## Conclusões e Próximos Passos` completo (4 subseções + tabela); faltando algo → aviso listando o que falta, build segue *(WARNING e não FATAL: a capa é opcional)* |
| `PROJECT_NAME_RESOLVED` | Sem nome resolvível em `capa.md`/`product-vision.md` → aviso + fallback `Projeto sem nome definido` — **nunca** o token `[Nome do Projeto]` |
| `MISSING_FILE_OMITTED` | Arquivo ausente → capítulo e link omitidos, sem link órfão; registrado em «Artefatos omitidos» na capa |
| `MODULE_GROUP_CONDITIONAL` | Grupo "Especificação por módulo" só com `## Módulo:` presente; senão omitido por completo |
| `DOMAIN_CONDITIONAL` | Domínios só com artefato presente (Fluxos exige flow-map **válido**; Técnico, data-model/SVG **ou tech-rules-summary**; Revisão, `revisao.json` legível; Qualidade, gaps/sync-log) |
| `FLOWMAP_INVALID_WARNED` | flow-map inválido → domínio omitido + **alerta vermelho** com os erros em Visão Geral; o build **nunca** aborta por isso |
| `FLOWMAP_TOOL_UNAVAILABLE` | Validador ausente/timeout/erro/saída não-JSON → domínio omitido + **aviso amarelo** com código `TOOL_*`. **Não** reportar como flow-map inválido |
| `SCREENSHOT_CAP_WARNED` | Captura acima do cap (1,5 MB / 24 MB agregado; flags `--screenshot-*` ou env `SPEC_REPORT_SCREENSHOT_*`) → link relativo em vez de embed + aviso amarelo + linha em `stderr` |
| `REPORT_MANUAL_FLAGGED` | HTML montado pelo Fallback manual → rodapé `⚠️ REPORT-MANUAL` + motivo no `sync-log.md` |

### Responsabilidade do agente — não é gate do script

| Código | O que o agente deve fazer |
|--------|---------------------------|
| `SYNC_LOG_UPDATED` | Após gerar o HTML, adicionar linha na Seção A do `sync-log.md` com a versão produzida e os GAPs ainda abertos — escrita posterior à execução, o script não tem como verificar |

---

## O que NÃO faz

- Não altera os `.md` fonte — só lê e compila; qualquer correção de conteúdo é feita nas skills de origem (`spec-product`, `spec-iterate`, etc.)
- Não gera nem infere conteúdo de negócio novo — a síntese executiva da capa deve ser rastreável aos artefatos existentes
- Não inclui `prototype.md`, `frontend-decisions.md`, `gaps-answers.md` nem código-fonte (`src/`) no kit
- Não decide o que é GAP nem fecha GAPs — apenas reflete o estado de `gaps.md` no momento da geração
- Não substitui `spec-iterate` como dono do ciclo de fecho de GAPs — só reporta o que já está registrado

---

## Skills irmãs

| Skill | Consome | Papel na compilação |
|-------|---------|---------------------|
| `spec-product` | `product-vision.md`, `business-rules.md`, `requirements.md`, `product-requirements.md` | Fonte dos capítulos de documentos completos e do pivot por módulo |
| `spec-legacy` | `legacy.md`, `architecture.md`, `legacy-analysis.md`, `threat-model.md` | Fonte dos capítulos do grupo "Legado AS-IS" (condicionais) |
| `spec-benchmark` | `benchmark.md` | Fonte do capítulo "Mercado" |
| `spec-ingest` | `discovery-document.md`, `context-map.md` | Fonte dos capítulos do grupo "Contexto bruto" |
| `spec-iterate` | `gaps.md`, `sync-log.md` | Fonte do capítulo "Governança", do domínio "Qualidade & GAPs" e do sumário executivo (top GAPs) da capa |
| `spec-product` (flow-map) | `flow-map.md`, `screens/TEL-xxx.png`, `screens-manifest.json` | Fonte do domínio "Fluxos & Telas" (dados via `tools/check-flowmap.py --json`) |
| `spec-data-model` / `spec-api-contracts` | `data-model.json`, `*.svg`, `api-contracts.yaml` | Fonte do domínio "Técnico" (YAML só referenciado, nunca parseado) |
| `spec-tech-rules` | `tech-rules/tech-rules-summary.md` | Capítulo «Regras técnicas» do domínio "Técnico" (os `.mdc` não entram — são rules para o agente) |
| *revisão do harness* (`.claude/hooks/revisao.mjs`) | `revisao.json` | Fonte do domínio "Revisão" — não é skill do kit, é o harness Elo v2 |
| `spec-prototype` | — | `prototype.md` é referenciado por nota na capa, **não** incorporado ao HTML; screenshots do protótipo entram via `screens/` |

---

## Posição no fluxo

→ Opcional **após** a maior parte dos artefatos existir (tipicamente após `spec-product` ou `spec-iterate`). Não substitui as skills nem altera os `.md` — só **compila** para entrega HTML.
