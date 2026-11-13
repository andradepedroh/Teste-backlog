# Manutenção do template — para quem mantém, não para quem usa

> **Este documento não é para o projeto.** Quem clona o template segue o `README.md` e o
> `CLAUDE.md`, e para o projeto a regra continua sendo a da Decisão 18: **nunca edite a zona
> imutável; a atualização sobrescreve.** Este documento é para quem mantém o template.

## O kit vendorizado é a fonte única de verdade

`.claude/skills/` é onde as mudanças do `Elo-spec-kit` são feitas (Decisão 30). O fluxo anterior —
uma cópia de referência fora do harness, com a vendorização copiando dali — terminou em 2026-09-09.

O upstream é `https://dev.azure.com/elotech/Arquitetura/_git/Eng_Proc`, do time Eng_Proc da ELO
Group. Nós não escrevemos lá. Cada entrega dele chega como pacote e é guardada **como recebida**,
somente leitura, num diretório datado do repositório de documentos (`Contexto/Elo-spec-kit <data>/`).
O vigente é o `Contexto/Elo-spec-kit 09-29/` (entrega de 2026-09-29). **Essa base é reconstruída, não
recebida limpa** (Decisão 64): o zip chegou misturado, e o `LEIA-ANTES.md` da pasta explica o que
foi reconstruído e como — leia-o antes de usá-la como base de merge.

## Atualizar é merge de três pontas — exceção nomeada à Decisão 18

A Decisão 18 diz que atualizar é sobrescrever, não fazer merge, e a justificativa é *"se ninguém
edita o maquinário, a atualização não conflita"*. Para `.claude/skills/` essa premissa deixou de
valer: nós editamos. Então:

1. **A entrega nova substitui o snapshot datado.** A anterior fica no histórico do git, que é o
   arquivo — não acumule pastas. Foi assim que o `Elo-spec-kit 09-29` substituiu o `08-09`: o
   merge de três pontas dessa entrega (relatório e script em `docs/execucao/plano-10/` do
   repositório de documentos) é o exemplo de como se faz.
2. **`diff base_velha base_nova` = o que o upstream mudou.**
3. **`diff base_velha .claude/skills/` = o que NÓS mudamos** — as três diferenças deliberadas
   abaixo, mais qualquer outra edição de skill que este harness tiver feito desde a base.
4. **Reconciliar:** aplicar (2) sobre a nossa cópia, preservando (3). **`cp -r` sozinho não
   reconcilia — ele acrescenta e sobrescreve, mas nunca apaga.** Toda remoção que (2) revelar (uma
   entrada `Only in base_velha`, ausente de `base_nova`) tem que ser apagada à mão da nossa cópia
   depois do `cp -r`, com o mesmo comando de verificação, agora contra o pacote novo:

   ```
   diff -rq base_nova .claude/skills/
   ```

   Cada linha `Only in .claude/skills/: <caminho>` é candidata a exclusão — apague o arquivo (ou a
   pasta, e qualquer pasta que fique vazia depois de apagar). **Exceção: os dois nomes de topo
   `auditoria-de-us` e `revisao-de-seguranca`.** Eles nunca existiram no upstream, então SEMPRE
   aparecem nessa lista — o diff não distingue "upstream removeu" de "nunca foi do upstream". Não
   apague nada com esses dois nomes de topo; são as diferenças deliberadas da seção seguinte, não
   sobra a limpar.

**O snapshot não é uma régua; é a base de merge.** Sem ele o passo 3 é impossível — não há como
separar as nossas edições das do upstream, e uma entrega nova apaga o nosso trabalho em silêncio.

**O passo 3 é byte-a-byte confiável para o conteúdo de um arquivo presente nos dois lados porque a
zona das skills está sob `-text`** (Decisão 32, no `.gitattributes` da raiz). A regra que já existia
ali — `* text=auto eol=lf` — normaliza o repositório para LF, e **normalizar não é o mesmo que não
converter**: 13 arquivos do pacote do upstream carregam CRLF de verdade, e o `text=auto` os gravava
em LF no blob, deixando a cópia viva não byte-idêntica ao pacote nesses 13. Medido: **13 arquivos
divergentes num `diff -r` cru contra o pacote antes da regra, 0 depois** — para todo arquivo
presente nas duas árvores. *(Medição da entrega de 2026-09-09. O pacote de 2026-09-29 traz **55**
arquivos com CRLF — a maior parte do kit —, preservados byte a byte pela mesma regra. Ao fazer o
merge de três pontas de um arquivo que difere dos dois lados, normalize as três pontas para LF,
mescle, e grave o resultado de volta no separador do upstream; `git merge-file` em bytes crus
transforma a diferença de fim de linha num conflito de arquivo inteiro.)*

**Por isso o `diff -r` do passo 3 roda cru, sem `--strip-trailing-cr`.** Comparação que precisa de
flag para não mentir é pior que comparação que não precisa. Há teste de controle negativo em
`vendorizacao.test.mjs` provando que a regra não vazou para o resto do repositório.

**O `diff -r` ainda aponta `Only in` mesmo depois de reconciliar, e isso é esperado — não é ruído a
eliminar, é o passo 4 fazendo o trabalho dele.** Byte-identidade vale para arquivos presentes nos
dois lados; ela não implica que as duas árvores tenham a mesma lista de arquivos, e as duas direções
significam coisas diferentes. `Only in base_nova` é o upstream trazendo algo nosso `cp -r` ainda não
copiou. `Only in .claude/skills/`, dentro de uma skill que o pacote também distribui, é o caso do
passo 4: quase sempre é uma remoção do upstream que a nossa cópia — vinda de um `cp -r` anterior —
nunca apagou, porque `cp -r` não apaga. Uma entrega já passou por esse exato defeito, sem o passo 4
acima: cinco arquivos (o stub de compatibilidade em `spec-iterate/templates/`, a `docs/` inteira de
`spec-tech-rules/`, e dois arquivos de teste soltos em `tools/`) sobreviveram na cópia viva depois de
o upstream tê-los removido do pacote, e o `MANUTENCAO.md` de então tratava isso como "lacuna real"
em vez de mandar apagar. Quem reconcilia precisa rodar o `diff -rq` do passo 4 até ele não sobrar
nenhum `Only in .claude/skills/` fora dos dois nomes de topo da exceção — não só olhar a lista de
diretórios de primeiro nível.

A Decisão 18 continua valendo, sem exceção, para o resto da zona imutável.

## No template a zona imutável é editável — marque a cópia de trabalho

A zona imutável (Decisão 18) existe para os **clones**: a atualização do template sobrescreve
aqueles caminhos, e sobrescrita só não conflita se ninguém os editou no projeto. Para quem mantém o
template ela é o oposto, é exatamente o que se edita.

**Desde a Decisão 67 a trava abre no template.** O template se reconhece por um arquivo-marcador
ignorado (Decisão 40). Crie um arquivo vazio chamado `.harness-template` na raiz de **cada cópia de
trabalho do template** — a principal e cada worktree, porque worktree nova nasce sem arquivos
ignorados — **pelo terminal**, fora do agente:

    touch .harness-template                          # Git Bash
    New-Item -ItemType File .harness-template        # PowerShell (não tem `touch`)

Com o marcador presente, `Write`, `Edit` e `Bash` passam na zona imutável, e a manutenção (inclusive
os passos 1 e 4 do merge de três pontas) roda pelo agente, sem patch. O que continua guardado no
template: o `.git/` (destruição catastrófica) e o congelamento do Explore.

Ele está no `.gitignore`, então nunca viaja num `git clone`: um clone só o tem se alguém o criar à
mão, e a suíte (`vendorizacao.test.mjs`) fica vermelha se ele for versionado. Sem o marcador a trava
nega e manda a mensagem de clone.

**Num clone, o marcador sozinho não destrava.** O template é reconhecido pelo marcador **e** pela
ausência do `harness-zona.lock.json` (`souOTemplate`, `zonas.mjs`). Todo pacote publicado leva o
manifesto, e o template nunca o tem. Se o manifesto sumiu do disco mas está no `HEAD` do git, a cópia
é tratada como clone: apagar o manifesto e criar o marcador não abre a zona. Num clone, as travas do
agente negam escrita na zona imutável, no manifesto e no marcador por `Write`/`Edit`/`NotebookEdit`,
por `Bash` e pela tool `PowerShell`:

- No `Bash`, glob em posição de escrita casa contra os caminhos protegidos **por padrão**:
  `rm harness-zona*` e `rm -rf .cl*` são negados, `rm *.log` passa. `touch` conta como escrita, e
  `mkdir .harness-template` é negado.
- No `PowerShell` (trava `escrita-powershell`) conta o **alvo**, por instrução: o comando é partido
  por `;`, `&&`, `||`, quebra de linha e `|` (fora de aspas e de `()`/`{}`), e só nega o caminho que
  o verbo de escrita daquele estágio recebe — `Copy-Item` conta o destino (a origem é leitura),
  `Move-Item`/`Rename-Item` origem e destino, `>` só o alvo; `Set-Location`/`Push-Location` com
  caminho literal mudam a base do relativo e do glob. `node .claude/skills/x/cli.mjs`,
  `Copy-Item <template da skill> outputs/` e `git commit -m '… CLAUDE.md'` passam. Pipeline que
  alimenta quem destrói ou escreve no alvo vindo do pipe (`Get-ChildItem .claude/hooks |
  Remove-Item`, `… | ForEach-Object { $_.Delete() }`) faz contar os caminhos de todos os estágios.
  Aspa ou grupo que não fecha volta à regra grossa: verbo e caminho protegido no mesmo comando
  negam. Até a revisão de riscos de 2026-10-21 a regra grossa era a única, e negava comando
  legítimo nos clones — no template a trava abre, por isso ninguém via.

**O projeto estende o harness sem fork.** Um agente novo em `.claude/agents/` e uma skill nova em
`.claude/skills/<nome>/` (nome que o pacote não tem) são do projeto: as travas permitem criá-los e
editá-los, e o `verificar-zona.mjs` os lista como aviso "extensão do projeto". Editar ou apagar
arquivo que veio no manifesto, ou acrescentar arquivo dentro de uma skill do pacote, continua
reprovando. Sem manifesto (clone anterior à 2.6.0), vale o comportamento antigo.

**A trava local nunca foi a garantia dos clones**: `node -e`, caminho montado em variável,
`Set-Location` para caminho em variável no PowerShell, o terminal e a IDE passam por fora dela. A garantia é a verificação da
zona imutável no PR do projeto, contra o manifesto publicado com o pacote.

### O manifesto da zona e a verificação no PR

Cada pacote publicado leva, na raiz, um `harness-zona.lock.json`: a versão, a lista da zona imutável
daquele runtime e o SHA-256 de cada arquivo dela (fim de linha normalizado). Ele **não é versionado
aqui** — nasce na publicação, sobre a árvore que vai no zip:

| Pacote | Quem monta o manifesto |
|---|---|
| Claude Code | `empacotar.mjs`, que o põe no zip por `git archive --add-file` |
| Cursor | `gerar-cursor.mjs`, sobre a saída gerada |
| Kiro | `gerar-kiro.mjs`, sobre a saída gerada |

No projeto, `node .claude/ferramentas/verificar-zona.mjs` confere a zona contra o manifesto (no
template, sem manifesto, ele só diz que não há o que verificar). O README ensina o projeto a ligá-lo
como build validation do PR, pelo `.claude/templates/pipeline-verificar-zona.yml` (Node 24.x); com
`--base`, ele também recusa manifesto alterado no PR sem a versão mudar. O pipeline usa `--base` da
branch de destino no PR e `--base HEAD~1` no push para a `main`; só o primeiro commit roda sem base.
O manifesto da base é comparado pelo JSON, então CRLF/LF não conta como edição, e um
`.harness-template` **versionado** reprova sempre (`marcador-versionado`): no template de verdade ele
é ignorado pelo git.

O que a verificação **não** impede: quem edita a zona, regenera o manifesto e sobe a versão passa.
Essa edição fica explícita no diff do PR (o log diz "atualização do harness X → Y"), e é o revisor
humano quem a recusa. Esconder a edição é o que deixa de ser possível.

## As três diferenças deliberadas — preserve-as

A lista de diretórios de primeiro nível em `.claude/skills/` diverge do pacote do upstream em
exatamente três nomes de skill:

| Diferença | Por quê |
|---|---|
| `spec-init` **fora** da nossa cópia | excluída na vendorização (Plano 3, Task 7) — o template já traz as rules preenchidas. O upstream continua distribuindo a skill |
| `auditoria-de-us` **dentro** | skill do `harness-elo` v1, migrada adaptada no Plano 3 |
| `revisao-de-seguranca` **dentro** | idem — produz o kernel `plano-de-seguranca.md` |

A `spec-frame` **entrou** em 2026-10-06, com o kit de 29/09: é skill nova do upstream (Fase 1,
opcional, antes da `spec-ingest`), não diferença nossa — ela não aparece como `Only in`. Está
nas diferenças de **conteúdo**, abaixo, porque levou um parágrafo nosso.

**`cp -r` do pacote preserva as duas skills do v1**, porque copiar não apaga; o único ajuste manual
é remover a `spec-init`. Uma atualização feita com `rsync --delete` ou "apaga e copia" mataria as
duas — e aí **a suíte fica vermelha**, que é o desenho certo:

- `.claude/hooks/vendorizacao.test.mjs`, teste `'a spec-init NÃO foi vendorizada — o template já
  traz as rules preenchidas'`, prende a **ausência** da `spec-init`.
- `.claude/hooks/migracao.test.mjs`, teste `'as duas skills, as referências e os dois templates
  existem'`, prende a **presença** de `auditoria-de-us` e `revisao-de-seguranca` (`SKILL.md` e o
  template de cada uma).

**Atenção ao número de versão ao reconciliar.** `spec-data-model/SKILL.md` está em `version: "1.6"`
na nossa cópia (o `1.6` é do `check-traceability.mjs`, plano de melhoria das skills, Onda 3); o
upstream entregou `"1.4"` no snapshot atual. O `1.5` também foi um bump **nosso**, feito
junto com as edições de conteúdo da tabela abaixo — não veio do upstream. A próxima entrega
provavelmente chega em `1.5` ou `1.6` com conteúdo diferente do nosso, e a linha `version` vai
aparecer como um conflito de texto comum no `diff base_velha .claude/skills/`, sem nada indicando
que o nosso lado daquela linha é um bump local e não uma edição de conteúdo esquecida. Ao
reconciliar essa linha, o valor a preservar é **o número mais alto que fizer sentido para o
conteúdo final** (nosso, do upstream, ou um novo bump), não necessariamente nenhum dos dois
literalmente.

## Skills cujo CONTEÚDO nós bifurcamos

### spec-data-model

As três diferenças acima são de **diretório** — uma skill inteira presente ou ausente. Desde o
Bloco 2 deste plano há também uma diferença de **conteúdo**, dentro de uma skill que o upstream
continua distribuindo, e essa é a mais frágil das duas porque o `diff -rq` do passo 3 não a resume
numa linha `Only in`: ela aparece como arquivo que difere dos dois lados. Medido com
`diff -rq` contra o snapshot de então (`Elo-spec-kit 08-09/`, hoje só no histórico do git):

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | editado (inclui o bump de versão acima) |
| `templates/data-model.brownfield.example.json` | editado |
| `templates/data-model.greenfield.example.json` | editado |
| `templates/data-model.schema.json` | editado |
| `templates/data-model.stub.json` | editado |
| `scripts/render-data-model-md.mjs` | novo — não existe no upstream |

Nenhum outro arquivo de `spec-data-model/` diverge — `render-er.mjs` e `validate-data-model.mjs`,
por exemplo, continuam byte-idênticos ao pacote. Ao reconciliar esta skill, o passo 2
(`diff base_velha base_nova`) vai mostrar o que o upstream mudou nesses mesmos arquivos, e o passo
4 precisa aplicar essa mudança **preservando** as nossas edições — não é um `Only in` que se apaga,
é merge de conteúdo de verdade, arquivo por arquivo.

### auditoria-de-us e revisao-de-seguranca — Plano 5, Task 2

Nunca existiram no upstream (ver *"As três diferenças deliberadas"*), então não aparecem como
conflito de conteúdo no `diff -rq` — aparecem como `Only in .claude/skills/`. Registradas aqui porque
carregam o bloco `<!-- linguagem-clara:v1 -->` **copiado à mão** do `spec/SKILL.md`: quando o
upstream mudar o bloco (para `v2`, por exemplo), o `skills-prosa.test.mjs` fica vermelho nestas duas
e diz o que replicar. É o substituto do `apply_linguagem_clara.py` que a nossa cópia não tem — a
decisão pendente da seção *"Duas ferramentas do upstream"* está fechada por este teste (Decisão 42).

| Arquivo | Tipo de mudança |
|---|---|
| `auditoria-de-us/SKILL.md` | bloco «Linguagem clara» + `### Aplicação nesta skill`; `version` 2.0 → 2.1 |
| `revisao-de-seguranca/SKILL.md` | idem |

### spec — Plano 5, Task 3

*(Numeração de 2026-09-10, e continua valendo nesta tabela. O kit de 29/09 renumerou as fases em
outros arquivos, mas **não** a tabela *Skills irmãs* do orquestrador: lá a `spec-api-contracts`
segue `6b` e a `spec-tasks` segue `7`, e a nossa linha da `spec-test-plan` fica `6c` — é o que o
`skills-prosa.test.mjs` prende. O orquestrador subiu para a `version` **1.3**, ver abaixo.)*

Item 4 da §8: a `spec-test-plan` entra na tabela canônica do orquestrador como Fase 6c, entre a
`spec-api-contracts` (6b) e a `spec-tasks` (7) — ela produz o `test-plan.md` que é fonte dos
cenários de aceite que a `spec-tasks` grava nas tasks.

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | tabela canônica: linha da `spec-test-plan` (6c), inserida antes da linha da `spec-tasks` (7); `version` 1.1 → 1.2 + parágrafo *De onde ele parte* (Task 4) |

O bump do `spec/SKILL.md` acontece **nesta task**. A Task 4 edita o mesmo arquivo (outro trecho)
sem novo bump de `version` — o número já está correto para o conteúdo final desta e da próxima
edição.

**Plano 10 (2026-10-06): `1.2` → `1.3`.** O upstream entregou o `spec/SKILL.md` também em `1.2`
(2026-09-10), com conteúdo diferente do nosso — as duas linhas `1.2` colidiam. O merge manteve a
descrição deles (a `spec-frame` como Fase 1 e a cadeia técnica em 6.5–11) e a nossa linha da
`spec-test-plan` e o parágrafo *De onde ele parte, neste harness*, e subiu para `1.3`.

**Revisão final do Plano 10: a condição do parágrafo *De onde ele parte*.** Ela era o marcador
`outputs/spec/_explore-congelado.md`, que a `promocao.mjs --congelar` só cria no fim da
`spec-product`; no começo do Plan, quando a `spec-ingest` lê o Explore, ele nunca existe. A condição
passou a ser `outputs/explore/` trazer o pré-projeto do Explore, no mesmo commit da `spec-frame`,
sem novo bump de `version` (segue `1.3`).

### spec-test-plan — Plano 5, Task 3

*(Numeração de 2026-09-10. Com o kit de 29/09 o rótulo da skill passou de `6c` para **`7c`**, e é o
que o nosso `skills-prosa.test.mjs` prende. Nós a rotulamos `7c` na própria skill e em
`tools/references/task-pipeline.md` (antes da `spec-tasks`, Fase 8), e `6c` no orquestrador e na
`paths.md`; o upstream usa `8a` na skill e na `task-pipeline.md` (inclusive na `spec-implement`) e
`7a` em outros arquivos (`spec-tasks`, `spec-status-report`, `paths.md`). A nossa posição, antes da
`spec-tasks`, é a mesma de sempre; os rótulos que sobram no kit seguem inconsistentes, decisão
pendente do usuário.)*

A skill deixa de se autodenominar "Fase 7a" — rótulo que sobrevivia de quando ela foi desenhada
como consumidora dos mesmos insumos da `spec-tasks`, sem ordem definida entre as duas. Agora ela é
Fase 6c, roda ANTES da `spec-tasks`, e a `description` e o diagrama de posição na pipeline dizem
explicitamente que ela é CONSUMIDA pela `spec-tasks` (Fase 7), não a inversa.

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | rótulo de fase `Fase 7a` → `Fase 6c` (description e diagrama "Posição na pipeline"); direção do consumo com a `spec-tasks` explicitada ("Consome os insumos da Fase 6 e é CONSUMIDO pela spec-tasks"); `version` 1.4 → 1.5 |

### spec-security-review — Plano 5, Task 5

Item 3 da §8: a `spec-security-review` deixa de derivar os controles `SEC-###` por conta própria e
passa a **consumir** o kernel `outputs/spec/plano-de-seguranca.md` que a `revisao-de-seguranca`
produz — o `cadeia.mjs` (`CADEIA-SEC-01`) já bloqueava a skill sem esse artefato, e a própria skill
nunca mencionava o kernel. Agora o Catálogo SEC do kernel entra primeiro (novo Passo `E.0-K`),
preservando o **ID original** de cada `SEC-###`; os Passos C e D passam a derivar só o que o kernel
não cobre, numerando a partir do maior `SEC-###` do kernel, e todo controle derivado vai para
`## Questões em aberto` do `security-review.md` como candidato a entrar no kernel — não para uma
segunda lista concorrente.

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | Pré-requisitos: linha `plano-de-seguranca.md` (**Sim**, `CADEIA-SEC-01`); Kickoff: item 5 novo ("Kernel de segurança"); Passo A: item 1 novo (ler o Catálogo SEC); Passo E: novo `### E.0-K` antes do `E.0`; Validators: novo `KERNEL_CONSUMED` (WARNING); Skills irmãs: linha da `revisao-de-seguranca`; `version` 1.3 → 1.4 |

### tools/references — Plano 5, Task 3

*(Numeração de 2026-09-10; no kit de 29/09 a linha da `spec-test-plan` na `task-pipeline.md` é `7c`,
antes da `8` (`spec-tasks`). A `paths.md` segue com `6c`: o upstream não a renumerou.)*

A tabela artefato → path de `paths.md` precisa concordar com a tabela canônica do orquestrador:
a linha da `spec-test-plan` muda de `7a` para `6c` e passa a vir antes da linha `7` (`spec-tasks`).

| Arquivo | Tipo de mudança |
|---|---|
| `paths.md` | linha da `spec-test-plan` movida de `7a` para `6c`, reposicionada antes da linha `7` (`spec-tasks`) |
| `task-pipeline.md` | *(revisão final do Plano 5)* mesma correção na **Tabela canônica de fases** (§1): a `spec-test-plan` continuava `7a`, depois da `spec-tasks` — a Task 3 arrumou as outras duas tabelas e passou por esta. Sem `version` no frontmatter (como a `paths.md`) |

### spec-prototype — Plano 5, Task 6

Item 5 da §8: a skill se contradizia sobre fidelidade Média. Três linhas (Passo 1.2 e sua
pergunta ao usuário) já diziam "sem `src/`", mas a linha Média do Padrão de Qualidade (Passo 3.2)
mandava **implementar** o happy path em código de verdade e deixar as demais telas como
"stub navegável (rota + título + esqueleto)", e o validador `MEDIA_FIDELITY_NO_STUB` reprovava
tela do Inventário "sem stub navegável (rota inexistente na navegação)" — as duas exigindo rota,
logo escrita em `src/`. Decisão 41 fecha a favor do lado que já dizia "sem `src/`": em Média, o
happy path e os fluxos críticos são **descritos** no `prototype.md` (com referências a frames),
`stub` passa a significar presença na tabela do Inventário (3.1.5) com `Status: stub` — não rota —
e o validador cobra ausência **na tabela**, não ausência de rota na navegação.

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | linha 403 (definição de `Status: stub`): "rota existe, conteúdo placeholder" → "listada no Inventário, sem código (...) a rota não existe, porque Média não escreve em `src/`"; linha 421 (Padrão de Qualidade, linha Média): "implementar happy path (...) stub navegável (rota + título + esqueleto)" → "descrever no `prototype.md` (...) sem escrever em `src/`", toda tela do Inventário passa a precisar aparecer na tabela do 3.1.5; linha 603 (`MEDIA_FIDELITY_NO_STUB`): "sem stub navegável (rota inexistente na navegação)" → "ausente da tabela do Inventário (...) rota não é exigida"; `version` 1.2 → 1.3 |

### spec-ingest — Plano 5, Task 7

Item 10 da §8: o cabeçalho `Âncora (linha § / minuto)` da tabela de fatos atômicos oferecia âncora
por número de linha — forma que o `plan.md` do harness proíbe para fonte em `outputs/explore/`
(ali a âncora é `§` mais o ID literal; `minuto` só vale para transcrição). O cabeçalho novo,
`Âncora (§ + ID da fonte / minuto)`, tira a terceira opção; o exemplo do `SKILL.md` que ensinava
`L124–126` passa a ensinar minuto (`00:14:20`), coerente com a única forma que sobrevive para
transcrição. Uma linha de comentário HTML, logo abaixo da tabela do template, registra a regra por
extenso. O `promocao.test.mjs` prova o casamento: lê o cabeçalho de verdade do template vendorizado
e confere que o `promocao.mjs` (`indiceDa`/`lerFatos`) ainda acha a coluna por ele — e não acha sem
a palavra `Âncora`.

| Arquivo | Tipo de mudança |
|---|---|
| `templates/context-map.md` | linha 36: `Âncora (linha § / minuto)` → `Âncora (§ + ID da fonte / minuto)`; comentário HTML novo logo abaixo da tabela de fatos atômicos, explicando a regra de âncora do `plan.md` |
| `SKILL.md` | linha 208: mesma troca de cabeçalho; linha 156: exemplo `` Âncora: `reuniao-01.txt` L124–126 `` → `` Âncora: `reuniao-01.txt` 00:14:20 ``; `version` 1.2 → 1.3 |

### spec-frame — Plano 10 (entrou em 2026-10-06)

Skill nova do upstream no kit de 29/09 (Fase 1, opcional, antes da `spec-ingest`). Levou **um
parágrafo nosso**, *De onde ela parte, neste harness*: quando `outputs/explore/` traz o pré-projeto
do Explore — o caso normal no começo do Plan —, ela lê `outputs/explore/`, trata o insumo como
material rico e manda entrar direto na `spec-ingest`; a `plan.md` a lista no Tempo A como «não
roda». Mesma condição do parágrafo equivalente do `spec/SKILL.md`. A condição **não** é o marcador
`outputs/spec/_explore-congelado.md`: ele só nasce no fim da `spec-product` (`promocao.mjs
--congelar`), depois do momento em que a `spec-frame` roda — a primeira versão do parágrafo o usava
e nunca disparava (revisão final do Plano 10). O `skills-prosa.test.mjs` prende a condição.

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | parágrafo *De onde ela parte, neste harness*; `version` 1.0 → 1.1 |

O bloco *Linguagem clara* dela traz o título **dentro** dos marcadores (as outras skills o põem
acima); é divergência do upstream, tratada no `skills-prosa.test.mjs`.

### spec-tech-rules — Plano K1, Task 7

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | editado — ambiente `kiro` no PASSO 1.0, na tabela "Onde salvar" e na conversão; bump 4.1 → 4.2 |
| `tools/mdc_to_md.py` | editado — `convert_kiro` e a flag `--kiro` |

A skill vale nas duas versões do harness; o gerador **não** reescreve esta lógica.

### spec-tech-rules — conversor e leitura do Kiro, 2026-10-19

| Arquivo | Tipo de mudança |
|---|---|
| `tools/mdc_to_md.py` | editado — vírgula dentro de chave não separa glob; no Kiro, chaves expandidas em lista no `fileMatchPattern`, rule só com `description` vira `inclusion: auto` + `name`, frontmatter sempre no início; aviso de orçamento acima de 12.000 caracteres (`LIMITE_CARACTERES`, `avisos_de_tamanho`); saída sempre em LF |
| `SKILL.md` | editado — o aviso de formato do `paths:` ("aspas ou lista não carregam") troca pela medição de 2026-10-19; a tabela do Kiro ganha chaves e `auto`; o bloco "Como o Kiro lê o steering" corrige a crença de que a CLI carrega tudo; o orçamento de tamanho; o item Kiro do "Como usar"; bump 4.2 → 4.3 |

O comportamento do conversor é preso por `.claude/hooks/tech-rules-conversor.test.mjs`, que roda o
Python de verdade (`PYTHON_REPORT` ou `python`).

### spec-tech-rules — detecção do ambiente, 2026-10-16

> **PENDENTE — ainda não implementado.** Esta seção descreve o desenho; nem o `tools/ambiente.py`
> nem o `tech-rules-ambiente.test.mjs` existem, e o `SKILL.md` da skill (hoje na 4.4 — o bump de 2026-10-20 foi do `check-rules.mjs`) continua perguntando
> o ambiente. Até a implementação, a prosa das opções `claude` e `ambos` sai degenerada nas saídas
> Cursor e Kiro (a reescrita troca a pasta do Claude Code pela da ferramenta de destino), e quem usa a
> skill lá escolhe o ambiente da própria ferramenta na pergunta do PASSO 1.0.

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | editado — o PASSO 1.0 **detecta** o ambiente (`tools/ambiente.py --detectar`) e só pergunta quando não consegue; o PASSO 4 materializa pelo script (`--materializar`); a linha do sync-log registra de onde veio o ambiente; bump 4.4 → 4.5 |
| `tools/ambiente.py` | novo — detecção pelo `runtime` do `harness.json` e, sem ele, pela única pasta de configuração presente; materialização no destino e formato de cada ambiente, pelo `mdc_to_md.py` |

O sinal exato é o `runtime.rotulo` do `harness.json`, que cada versão grava: `Claude Code` na
fonte, `Cursor` no `gerar-cursor.mjs`, `Kiro (IDE ou CLI)` no `gerar-kiro.mjs`. Quem mudar esse
rótulo num gerador muda junto o `ambiente.py` — o `tech-rules-ambiente.test.mjs` de cada saída
confere que a detecção bate com o `harness.json` dela.

No script, os nomes das pastas são montados por partes (`"." + "claude"`). Os geradores reescrevem o
nome da pasta do Claude Code escrito por extenso, e sem isso o destino `claude` apontaria para a
pasta da ferramenta de destino na versão gerada. O teste segue o mesmo cuidado.

### spec-implement — validação independente (G3), 2026-10-15

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | editado. Entram: o passo **G3** entre G2 e H, com a linha dele no roteiro rápido; a condição do H (só com o G3 em `fim`); o código FATAL `VALIDACAO_INDEPENDENTE_APROVADA`; os WARNING `VALIDACAO_PARADA` e `VALIDACAO_INDISPONIVEL`. Bump 2.2 → 2.3 (nosso) |

O G3 chama `.claude/ferramentas/validar.mjs` e os agentes de `.claude/agents/`, os dois deste
harness. Ver a seção "Validação independente" mais abaixo. Ao reconciliar uma entrega nova do kit,
a seção G3 e as três linhas dos quadros de validador têm que sobreviver ao merge.

### spec-implement — decisões técnicas para quem não é técnico, 2026-10-19

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md` | editado — o passo J escreve também para uma pessoa não técnica. Entram: o público duplo; a seção "As decisões técnicas, sem jargão" (problema pela consequência, comparação do dia a dia, alternativa de fato considerada, preço da escolha); as seis regras dela; o item "Onde cada decisão mora no código" no lugar de "Decisões que tomei e por quê"; o exemplo preenchido; a quarta pergunta da checagem; o `CHAT_HANDOFF_DELIVERED`; a linha J do roteiro e a `description`. Alvo de tamanho 40 → 55 linhas. No mesmo bump, "Resolve rules location" ganha o Kiro: `.kiro/steering/` lido explicitamente, seja qual for o `inclusion`, porque a CLI V1/V2 só carrega sozinha a `always`. Bump 2.3 → 2.4 (nosso) |

Ao reconciliar, essa seção e as linhas acima têm que sobreviver ao merge, junto com o G3.

### spec-status-report — «O que falta testar» e «Bugs por módulo» (2026-10-14)

Primeira bifurcação de **código** desta skill. A aba nova `#lacunas-teste` (matriz de
rastreabilidade + a análise curada `status/test-gaps.json`), a seção «Bugs por módulo» em
Execução e backlog (atribuição de módulo em seis regras, gráfico SVG, evolução semanal), e o
`--render-only` relendo todos os artefatos de extensão. `version` 2.1 → 2.2 no `SKILL.md`,
2.1.0 → 2.2.0 no `package.json`, `RENDERER_VERSION` 2.0 → 2.2.

| Arquivo | Tipo de mudança |
|---|---|
| `SKILL.md`, `MAINTENANCE.md`, `package.json` | editados — domínios, artefatos de extensão, passo 4 do fluxo, bugs por módulo, avisos novos, 30 cenários, 93 casos |
| `cli.mjs` | editado — `--bug-types`, `--export-test-gaps-md`, `--render-only` com `refreshExtras` |
| `lib/build-status-data.mjs`, `lib/collect-extras.mjs`, `lib/collect-azure.mjs`, `lib/discover-artifacts.mjs` | editados — `testGaps`, `bugs`, extras novos, campos e pais dos bugs, módulo das épicas |
| `lib/charts.mjs`, `lib/components.mjs`, `lib/client-script.mjs`, `lib/render-domains.mjs`, `lib/render-shared.mjs`, `lib/render-status-html.mjs`, `lib/report-theme.css` | editados — gráficos de bugs, filtro múltiplo do grid, a aba no menu, `fmtDate` de data sem hora |
| `lib/bug-modules.mjs`, `lib/module-codes.mjs`, `lib/lacunas-teste.mjs`, `lib/lacunas-teste-md.mjs`, `lib/render-bugs.mjs`, `lib/render-lacunas-teste.mjs` | **novos** — não existem no upstream |
| `lib/fuso.mjs` | **novo** — dia e semana no fuso do relatório (America/Sao_Paulo) |
| `lib/collect-docs.mjs`, `lib/escape.mjs` | editados — lê as rules de `.claude/rules`, `.cursor/rules` e `.kiro/steering`; `inline()` recusa link `//host` |
| `templates/test-gaps.example.json`, `tests/lacunas-e-bugs.test.mjs` | **novos** |
| `tests/regression.test.mjs` | editado — apaga as pastas temporárias no fim da suíte |
| `templates/azure-snapshot.example.json` | editado — campos de bug, um Bug de exemplo, `ancestors` e a org de exemplo `minha-org` |

Ao reconciliar uma entrega nova, rode `node --test tests/*.test.mjs` **na pasta da skill** antes e
depois (93 casos: 61 em `regression.test.mjs` + 32 em `lacunas-e-bugs.test.mjs`): é a prova de que a
aba e a seção sobreviveram. Passe os arquivos, não a pasta — no Node 22+ `node --test tests/` falha
com `Cannot find module …\tests` — e não rode sem argumento: o padrão `**/test-*.mjs` pega
`lib/test-runners.mjs` e conta 94. Oito arquivos dela são CRLF no upstream e continuam CRLF aqui — o
merge desses precisa da normalização descrita no passo 3.

### Plano de melhoria das skills — Onda 1 (2026-10-20)

Defeitos de correção e de segurança confirmados na Onda 0 do plano de melhoria das skills. O plano,
os achados e o registro item a item (evidência RED → GREEN) eram documentos de trabalho e saíram do
repositório no PR da 2.6.0; o que ficou em aberto está em «O que ficou pendente no pacote 2.6.0».
Ao reconciliar uma entrega nova, cada linha abaixo é merge de conteúdo de verdade.

| Skill / pasta | Arquivo | Tipo de mudança |
|---|---|---|
| `spec-tasks-azure` | `lib/publish-plan.mjs` | **novo** — plano de publicação do `--dry-run`, sem rede; espelha a ordem, o WIT, o título, o pai e as tags do `azureDevopsService.js` |
| `spec-tasks-azure` | `cli.mjs` | editado — flag `--dry-run`, ajuda, `import()` dinâmico do serviço só na publicação |
| `spec-tasks-azure` | `SKILL.md`, `HISTORY.md`, `package.json` | editados — simular → mostrar → confirmar → publicar; FATAL `PUBLISH_CONFIRMED`; `version` 3.3 → 3.4 (nosso) |
| `spec-benchmark` | `SKILL.md` | editado — status quo da «Seção 5 (Sistemas Existentes)» do `discovery-document.md` (era «Seção 6», que é Contradições); `version` 1.1 → 1.2 (nosso) |
| `spec-code-audit` | `SKILL.md` | editado — relatório em `outputs/spec/code-audit.md` (era `outputs/code-audit/`); `GOLDEN_RULE_TRACEABILITY` aceita `SEC-NNN` proposto + `GAP-NNN` em `gaps-document.md` sem afrouxar o BLOQUEADO; `version` 2.3 → 2.4 (nosso) |
| `spec-code-audit` | `templates/code-audit.template.md` | editado — coluna Task SEC da Seção 11 |
| `spec-api-contracts` | `SKILL.md` | editado — `x-operation-type` (NEW/ALTER/REMOVED) no delta; D_change monta o contrato resultante antes do `oasdiff`; `version` 1.4 → 1.5 (nosso) |
| `spec-convert-prototype` | `SKILL.md` | editado — português de Portugal → do Brasil (64 trocas, só prosa); `version` 1.1 → 1.2 (nosso) |
| `spec` | `SKILL.md` | editado — o `ambiente=` do kickoff derivado do `harness.json` (`runtime.rotulo`), com `kiro`; `version` 1.3 → 1.4 (nosso) |
| `spec-status-report` | `SKILL.md`, `lib/resolve-scope.mjs`, `package.json` | editados — exemplos sem nome de cliente real; `version` 2.2 → 2.3 (nosso) |
| `spec-estimate-report` | `SKILL.md`, `HISTORY.md`, `package.json`, `templates/report-data.example.json`, `templates/report-data.schema.md`, `tests/regression.test.mjs` | editados — nome do cliente do projeto de referência trocado por «Exemplo»; os testes leem o nome do próprio exemplo; `version` 1.2 → 1.3 (nosso) |
| `tools` | `merge-contract-delta.py` | **novo** — contrato resultante (vigente + delta) do modo `_change` |
| `tools` | `check-outputs.py` | editado — `code-audit.md` procurado em `outputs/spec/` |
| `tools` | `references/task-pipeline.md` | editado — §4: `ambiente=<cursor\|claude\|kiro\|ambos>` |

Fora das skills, no mesmo passo: `.claude/rules/harness/plan.md` e `.claude/hooks/cadeia.mjs` (a
«Story de UAT» que a `spec-tasks` proíbe com `NO_UAT_BACKLOG`) e `.claude/hooks/fecho-explore.mjs`
(placeholder do kickoff com `kiro`). Testes que prendem tudo isso: `tasks-azure-dry-run.test.mjs`,
`contrato-delta.test.mjs` e `skills-correcoes.test.mjs` (novos), mais `cadeia.test.mjs` e
`fecho-explore.test.mjs` (ajustados).

**Item 1.7 — nível WCAG (2026-10-21, decisão do mantenedor: WCAG 2.2 AA).** A rule de frontend do
harness se dizia dona do nível WCAG, mas não declarava nenhum; a `spec-product` cobrava 2.2 AA e a
pergunta 9.2 da `spec-tech-rules` recomendava 2.1 AA.

| Skill | Arquivo | Tipo de mudança |
|---|---|---|
| harness | `.claude/rules/harness/frontend.md` | seção «Acessibilidade»: nível mínimo WCAG 2.2 AA e os critérios AA que mais caem em revisão |
| `spec-tech-rules` | `templates/frontend-default.mdc` | **a mesma** seção — o corpo tem de seguir idêntico ao da `harness/frontend.md` (premissa da Decisão 73) |
| `spec-tech-rules` | `references/kickoff-blocos.md`, `references/placeholders.md` | a 9.2 deixa de ser pergunta e informa o nível lido da rule; `{{A11Y_LEVEL}}` sai da rule; exigência maior do cliente vira exceção no `frontend.mdc` do projeto, nunca abaixo de AA (mesmo bump 4.4) |

Testes: `skills-correcoes.test.mjs` (1.7, os dois lados) e `preservacao.test.mjs` (corpos iguais).

### Plano de melhoria das skills — Onda 2: numeração de fases (2026-10-20)

O kit de 29/09 renumerou as fases só em parte dos arquivos. Em vez de bifurcar quase 29 SKILL.md,
a divergência é **medida** e entregue ao Eng_Proc:

    node .claude/ferramentas/relatorio-fases.mjs          # relatório em Markdown
    node .claude/ferramentas/relatorio-fases.mjs --json   # para máquina

Modo relatório: nunca falha por divergência (exit 0); exit 2 só sem a tabela canônica
(`tools/references/task-pipeline.md` §1). Em 2026-10-20: 176 citações atribuíveis, 81 divergentes,
**todos os `description` (o gatilho das skills) batendo** — por isso nada foi corrigido localmente.
O que o teste prende (`.claude/ferramentas/relatorio-fases.test.mjs`) é essa última parte: se uma
entrega nova trouxer `description` com fase divergente, a suíte fica vermelha. A lista para o time
do Eng_Proc é a própria saída do relatório. Rode de novo a cada reconciliação.

### Plano de melhoria das skills — Onda 3: gates determinísticos (2026-10-20)

Scripts **novos** que conferem por máquina FATAL que eram autoavaliados. Todos entram como
**WARNING** na skill (princípio P4 do plano: vira gate só depois de rodar em projeto real sem falso
positivo), e os códigos FATAL continuam FATAL — o script é a evidência deles. Edição no upstream só
na linha que chama cada script, mais o validator WARNING novo.

| Skill / pasta | Arquivo | Tipo de mudança |
|---|---|---|
| `tools` | `check-contracts.mjs` | **novo** — `SUPPLEMENT_MATCHES_YAML` e `EVERY_OPERATION_TRACED` (contrato × suplemento, YAML sem dependência) |
| `spec-api-contracts` | `SKILL.md` | Passo K chama o script; WARNING `CONTRACTS_CROSSCHECK_SCRIPT` (mesmo bump 1.5 da Onda 1) |
| `tools` | `check-testplan.mjs` | **novo** — contagem por categoria e épica, cobertura RN × caso, a linha `TESTPLAN_COVERAGE` do sync-log, e `TC_HAS_STEPS`, `TC_HAS_EXPECTED_RESULT`, `EPIC_HAS_MINIMUM_COVERAGE`, `NO_TECHNICAL_LANGUAGE` e os WARNING checáveis por texto |
| `spec-test-plan` | `SKILL.md` | passo G chama o script; WARNING `TESTPLAN_SCRIPT_CHECK`; **e** o caminho do `business-rules.md` corrigido para `outputs/spec/business-rules.md`, onde a `spec-product` o grava (item 1.11, achado na execução); `version` 1.5 → 1.6 (nosso) |
| `spec-data-model` | `scripts/check-traceability.mjs` | **novo** (de propósito fora do `validate-data-model.mjs`, que segue byte-idêntico ao upstream) — `TRACEABILITY_PRESENT`, `ALTER_HAS_CURRENT_STATE`, `HYBRID_HAS_NOTES` |
| `spec-data-model` | `SKILL.md` | Passo L chama o script; WARNING `TRACEABILITY_SCRIPT_CHECK`; `version` 1.5 → 1.6 (nosso — ver o aviso de versão acima: o 1.5 também era nosso) |
| `spec-tech-rules` | `tools/check-rules.mjs` | **novo** — `NO_PLACEHOLDER_LEFT` (fonte e pastas materializadas, sem descer em `harness/`) e `SECURITY_UNMODIFIED` (fim de linha não conta) |
| `spec-tech-rules` | `SKILL.md` | «Conferência final, antes do PASSO 5»; WARNING `RULES_SCRIPT_CHECK`; `version` 4.3 → 4.4 (nosso; o `skills-prosa.test.mjs` prende o número) |
| `spec-security-review` | `scripts/inject-sec.mjs` | **novo** — o Passo E por código: forma de cada task SEC (E.1 + esforço × dias), injeção no início da story (E.2), `metadata.securityReview` (E.4), `.tmp` + validador de auto-suficiência + `.bak` (E.0), recusa de reinjeção sem `--reprocessar` |
| `spec-security-review` | `SKILL.md` | Passo E chama o script (o manual vira degradação); WARNING `INJECT_SCRIPT_USED`; `version` 1.4 → 1.5 (nosso) |
| `auditoria-de-us` | `SKILL.md` | Passo A.4 roda a varredura determinística do delta; «não executa SAST» corrigido; `version` 2.1 → 2.2 |
| `spec-estimate` | `forecast.mjs` | **novo** — a parte calculável do método: CU e banda por task, HDF derivado, DAG (explicit, dependência de story, data-coupled, api-coupled) + Kahn + CPM + paralelização + score de gargalo, Monte Carlo 10.000 com Tuckman (humano e IA, semente fixa), datas em dias úteis; `--preencher` copia os números para o `estimate-data.json`. Fica com a IA o que é julgamento (EMs, DCI, SRI, riscos, Brooks, recomendações) e o custo — a skill tem duas fórmulas de custo que não concordam |
| `spec-estimate` | `SKILL.md`, `package.json` | Passo A' (calcular pelo script) e I.1 (`--preencher`); WARNING `FORECAST_SCRIPT_USED`; `version` 1.6 → 1.7 (nosso) |

Ferramenta nova do harness, para a `auditoria-de-us` (item 3.6):

    node .claude/ferramentas/varrer-entrega.mjs --desde-o-ramo <branch base> --repo <pasta do código>

É uma casca fina sobre o motor do G3 — `coletarMudancas` e `rodarExternas` do `validar.mjs` e o
`varrer` do `validacao/varredura.mjs` — com escopo de entrega inteira (merge-base com o ramo) em vez
de task. Só linhas acrescentadas, fora de `outputs/` e `.claude/`; exit 0/1/2. Mudou o motor, a
auditoria acompanha sem edição.

Testes: `check-contracts.test.mjs`, `check-testplan.test.mjs`, `check-traceability.test.mjs`,
`tech-rules-check.test.mjs`, `inject-sec.test.mjs`, `estimate-forecast.test.mjs` (em
`.claude/hooks/`) e `varrer-entrega.test.mjs` (em `.claude/ferramentas/`).

**Inconsistências do próprio método da `spec-estimate`, para o Eng_Proc** (achadas ao escrever o
`forecast.mjs`; o script segue a regra que a skill escreve por último ou a mais específica, e diz
qual): o CPM usa `duration = CU × hours_per_CU` (Layer 2), mas o Monte Carlo usa
`Σ durationEstimatedDays × HDF` (Layer 4) — o script usa dias com HDF nos dois, para o caminho
crítico e o Monte Carlo falarem da mesma coisa; o Monte Carlo cita `total_ia_days` da «Layer 6»,
que não existe (é a 1IA); o custo tem duas fórmulas (`team_size × salário × meses` e
`PM_adjusted × custo mensal`); a velocidade IA só cobre cinco tipos (`backend`, `test`, `frontend`,
`integration`, `infra`) — `database`, `security` e os demais ficam em 1,0× com aviso.

### Plano de melhoria das skills — Onda 4: SKILL.md mais curto, sem perder regra; Decisão 73 (2026-10-20)

Pedido do mantenedor em 2026-10-20, junto com a Onda 5. Duas partes.

**Decisão 73 — o que o harness já carrega não é materializado de novo.** Investigado antes, como o
plano pedia, e confirmado: o corpo do `security.mdc` e do `frontend-default.mdc` da
`spec-tech-rules` é **byte a byte** o da `.claude/rules/harness/security.md` e da
`.claude/rules/harness/frontend.md`. Com `ambiente=claude`, o PASSO 4 convertia os dois para
`.claude/rules/`, ao lado das do harness: a `security` (sem `paths`) carregava duas vezes em
**toda** volta, e o padrão de frontend duas vezes em todo arquivo de tela — ~8,5 mil tokens. Agora
o `mdc_to_md.py --dir` pula os dois quando a pasta de destino já tem a rule do harness equivalente
(`harness/security.md` e `harness/frontend.md` no Claude; `harness-security.md` e
`harness-frontend.md` no Kiro), imprime `PULADA` e, se sobrou cópia de execução anterior, avisa
sem apagar. No Cursor (cópia sem script) a regra está escrita no PASSO 4. A fonte em
`outputs/spec/tech-rules/` continua com os dois, e o `SECURITY_UNMODIFIED` confere lá. Fora do
harness nada muda.

**Reorganização.** Trechos lidos só em modo raro, só no fim ou só por quem mantém saíram do
SKILL.md para `references/` da skill (ou para o `MAINTENANCE.md` dela), e o SKILL.md cita cada um
dizendo quando lê-lo. O Bloco «Linguagem clara» não foi tocado (Decisão 42). A preservação (P5) é
conferida pelo `.claude/ferramentas/preservacao.mjs` contra a base tirada antes da mudança,
`.claude/ferramentas/preservacao-onda4.base.json`: todo código de validador, toda linha com
FATAL/MUST/NUNCA e todo ID do SKILL.md de antes continuam em algum arquivo da pasta da skill. Se
uma atualização do kit mudar uma dessas regras de propósito, tire a base de novo com `--base` e
registre aqui.

| Skill | SKILL.md (bytes) | O que saiu | Para onde |
|---|---|---|---|
| `spec-tech-rules` | 61.963 → 29.576 | os dez BLOCOs do kickoff; os placeholders de cada template | `references/kickoff-blocos.md`, `references/placeholders.md` |
| `spec-legacy` | 92.678 → 60.898 | Graphify (0.5.1–0.6); sinais (0.7); as 12 dimensões; o passo a passo do threat model (6.1–6.6) | `references/graphify.md`, `sinais.md`, `dimensoes.md`, `threat-model-passos.md`; `version` 2.3 → 2.4 (nosso) |
| `spec-tasks` | 127.940 → 98.025 | as duas tabelas de validators; tipos operacionais e task de spike; task de UAT legada; modo `_change` | `references/validators.md`, `tipos-operacionais.md`, `classe-uat-legado.md`, `modo-change.md`; `HISTORY.md` 1.7 (mesmo bump da Onda 6) |
| `spec-implement` | 83.892 → 73.761 | passo J: formato, regras de escrita, exemplo, checagem, relação com os relatórios | `references/devolutiva.md`; `HISTORY.md` 2.4 |
| `spec-report` | 29.817 → 23.025 | tabela de domínios, insumos e Mermaid; pivot por módulo e capítulos 1–14; fallback manual | `MAINTENANCE.md` § «O que o gerador já implementa»; `version` 3.1 → 3.2 (nosso) |
| `spec-security-review` | 37.468 → 34.838 | o esqueleto JSON do E.1 — **movido, não apagado**: o exemplo validado não tem os placeholders nem os mínimos de cada campo | `references/esqueleto-task-sec.md` (mesmo bump 1.5) |
| `spec-product` | 52.795 → 50.664 | o passo a passo do Vale (setup, conferência dos estilos, comando, modo degradado) | `tools/vale-styles/README.md` § «Uso no projeto», que **substituiu** a versão antiga dessa seção — ela divergia da skill (`MinAlertLevel = suggestion`, «toda ocorrência corrigida» × triagem 🟡/⚪); `version` 1.4 → 1.5 (nosso) |
| `spec-status-report` | 54.864 → 52.893 | cinco parágrafos de justificativa de design | `MAINTENANCE.md` § «Por que a skill é assim» (mesmo bump 2.3) |
| `spec-scaffold` | 19.006 → 19.118 | — (mudou a leitura, não o tamanho) | ~~leitura dirigida das rules~~ — **desfeita na revisão de riscos de 2026-10-21** (deixava auth, observabilidade e integrações fora do scaffold): volta a ler todas as rules do projeto, mais as duas do harness; ficam o HLD pelo `check-hld.py --json` e a saída do parágrafo Eng_Proc/Cowork; `version` 1.1 → 1.2 (nosso) |

Total: 560.423 → 442.798 bytes (−21%, ~29 mil tokens). O ganho de leitura de rules que a
`spec-scaffold` tinha em tempo de execução foi devolvido na revisão de riscos (linha acima).

**Não feito, de propósito:** os comandos repetidos da `spec-tasks` e as metas repetidas da
`spec-legacy` (deduplicar mexe em texto normativo espalhado, não em seção inteira); o kit HTML da
`spec-legacy` (é quase só o comando do script); o passo a passo do Vale da `spec-iterate` (fora da
linha do plano — hoje ela já aponta o README para o setup). **Não verificado:** a execução real de
cada skill num projeto-fixture antes e depois (P6) — a conferência foi estrutural (preservação,
suítes, verificadores do kit), não de artefato gerado por um agente.

Testes: `.claude/ferramentas/preservacao.test.mjs` (a base, a própria ferramenta, a Decisão 73 e a
`spec-scaffold`) e `.claude/hooks/tech-rules-conversor.test.mjs` (o `mdc_to_md.py` pulando as duas
rules no Claude e no Kiro, materializando tudo sem harness, avisando cópia antiga sem apagar). Os
testes que liam uma tabela movida passaram a ler a pasta da skill: `backlog-ordem-marca`,
`skills-correcoes` (1.4) e `skills-prosa` (domínio Revisão da `spec-report`).

### Plano de melhoria das skills — Onda 5: sobreposições estruturais, Decisões 68 a 72 (2026-10-20)

O plano deixava a Onda 5 para decisão do mantenedor. Em 2026-10-20 ele pediu a execução, e cada
tema virou uma Decisão numerada, tomada com a proposta do plano.

- **Decisão 68 — segurança do backlog.** O kernel (`revisao-de-seguranca`) lê o `hld.md` gerado
  logo antes dele, o `gaps.md` e a stack do `tech-rules-summary.md` (a stack deixa de ser pergunta
  do kickoff). A `spec-security-review` consome o kernel, deriva só o que ele não cobre e não
  calcula DREAD. `KERNEL_CONSUMED` vira FATAL, conferido pelo `inject-sec.mjs --kernel`.
- **Decisão 69 — auditoria de código.** Um motor determinístico em três escopos — `validar.mjs` na
  task, `varrer-entrega.mjs --desde-o-ramo` na US, `varrer-entrega.mjs --tudo` no repositório — e
  uma regra de rastreio SEC só, em `.claude/references/seguranca/rastreio-sec.md`. **Mudança de
  comportamento:** a `auditoria-de-us` passa a dar BLOQUEADA à US com SEC CRÍTICO/ALTO sem a task
  `SEC-NNN` no backlog. Antes bastava o `GAP-NNN`; agora o `SEC-NNN` proposto com o `GAP-NNN`
  registra a pendência, mas não libera a US. **Não feito:** os agentes `validador-*` com escopo de
  US e de repositório. Eles continuam por task, no G3; a `auditoria-de-us` e a `spec-code-audit`
  usam o varredor determinístico, não os agentes.
- **Decisão 70 — relatórios HTML.** Agregador determinístico na `spec-estimate-report`, não a fusão
  com a `spec-report`. O que já existe em JSON entra por código: o `backlog` e os totais de
  backlog do `tasks.json`, os arrays de `tecnica.hld` do `check-hld.py --json`, os números de
  `estimativa.forecast` e `estimativa.caminhoCritico` do `estimate-calc.json` do `forecast.mjs`. A
  IA escreve só o texto. `META_TOTAIS_MATCH` entra como WARNING (P4). Shell e engine não mudaram.
- **Decisão 71 — `spec-frame`.** Fica no kit, fora do fluxo padrão. Nenhuma mudança de texto: o
  orquestrador `spec` já a oferece como opcional, e o `plan.md` já diz que ela não roda aqui. O
  teste prende as duas coisas.
- **Decisão 72 — `spec-convert-prototype` × `spec-prototype`.** A convert converte protótipo
  externo ou fora do padrão (HTML/CSS/JS vanilla, outro framework, outro time, ou a
  `spec-prototype` em fidelidade Baixa/Média). O protótipo de fidelidade Alta já nasce em `src/`
  no padrão do `frontend.mdc` e vai direto para a `spec-implement`. Os quatro artefatos da convert
  saem de `docs/` para `outputs/spec/convert-prototype/`.

| Skill | Arquivo | Tipo de mudança |
|---|---|---|
| `revisao-de-seguranca` | `SKILL.md` | Decisão 68 — entradas `hld.md`, `gaps.md`, `tech-rules-summary.md`; PG-A/PG-B pelos containers, `INT-NN` e ADRs do HLD; a stack não é perguntada; a saída não edita mais a `especificacao-tecnica.md` (Explore congelado); WARNING `HLD_MISSING`; `version` 2.1 → 2.2 (nosso) |
| `spec-security-review` | `SKILL.md`, `scripts/inject-sec.mjs` | Decisão 68 — não calcula DREAD; `KERNEL_CONSUMED` FATAL; `--kernel` confere que todo SEC do catálogo do kernel, menos os `COBERTO`, virou task (mesmo bump 1.5 da Onda 3) |
| `auditoria-de-us` | `SKILL.md` | Decisão 69 — Regra de Ouro e `GOLDEN_RULE_GAP` pela `rastreio-sec.md`: sem task SEC no backlog, BLOQUEADA (mesmo bump 2.2 da Onda 3) |
| `spec-code-audit` | `SKILL.md` | Decisão 69 — Passo 0.1 roda `varrer-entrega.mjs --tudo --sem-externas --json` para `audit-signals/harness.json`; I.3 cita a `rastreio-sec.md` (mesmo bump 2.4 da Onda 1) |
| harness | `.claude/ferramentas/varrer-entrega.mjs` | Decisão 69 — `--tudo`: a base é a árvore vazia, então o diff é o repositório inteiro |
| harness | `.claude/references/seguranca/rastreio-sec.md` | **novo** — Decisão 69, a regra única de rastreio SEC |
| harness | `.claude/rules/harness/deliver.md` | Decisão 69 — parágrafo do motor único nos três escopos e da regra SEC |
| `spec-estimate-report` | `lib/aggregate.mjs` (**novo**), `cli.mjs`, `SKILL.md`, `HISTORY.md` | Decisão 70 — `--tasks`, `--hld-json`, `--estimate-calc`, `--montar`; validator `META_TOTAIS_MATCH` (AVISO) (mesmo bump 1.3 da Onda 1) |
| `spec-convert-prototype` | `SKILL.md`, `templates/verify-frontend-md-compliance.mjs` | Decisão 72 — seção «Âmbito»; description; artefatos em `outputs/spec/convert-prototype/`, com `<RAIZ>` nos scripts do `package.json` da app (mesmo bump 1.2 da Onda 1) |
| `spec-prototype` | `SKILL.md` | Decisão 72 — fidelidade Alta vai direto para a `spec-implement`; a troca dos mocks é da `spec-implement`; `version` 1.3 → 1.4 (nosso) |

Testes: `onda5-decisoes.test.mjs` (a forma escrita das cinco decisões), `inject-sec.test.mjs`
(`--kernel`), `varrer-entrega.test.mjs` (`--tudo`), `estimate-report-agregador.test.mjs` (formato
de cada nó montado contra o exemplo, campo por campo; `--montar` preservando o texto;
`META_TOTAIS_MATCH`) e `skills-prosa.test.mjs` (`KERNEL_CONSUMED` FATAL).

**Decisão 74 — achado SEC sem task: perguntar e, com «sim», criar pelo MCP (2026-10-20).** Pedido
do mantenedor ao revisar a Decisão 69. O bloqueio continua (a Regra de Ouro da `security.md` exige
a task antes do merge), mas a auditoria deixa de só apontar a falta: ela **pergunta** se o usuário
quer criar a task. Com «sim», cria no `tasks.json` (`inject-sec.mjs --acrescentar`) e no Azure
DevOps pelo MCP do Azure DevOps — Task filha da story, tags `logical-id:SEC-NNN` e `seguranca` —,
e grava o ID no `outputs/spec/id-map.json`, para a `spec-tasks-azure` atualizar o item em vez de
duplicá-lo. Com «não», ou com o MCP falhando, vale o caminho da Decisão 69 (SEC proposto + GAP, e
bloqueia). Vale para a `auditoria-de-us` e a `spec-code-audit`; no G3 da `spec-implement`, que é
um ciclo automático por task, a pergunta fica para a auditoria da US.

| Skill | Arquivo | Tipo de mudança |
|---|---|---|
| harness | `.claude/references/seguranca/rastreio-sec.md` | seção «Achado sem task no backlog — perguntar e, com «sim», criar»; a frase «quem audita não cria task» saiu |
| harness | `.claude/rules/harness/deliver.md` | o parágrafo da regra SEC diz que a auditoria pergunta e cria |
| `auditoria-de-us` | `SKILL.md` | Regra de Ouro, `GOLDEN_RULE_GAP`, Definição de pronto e «O que NÃO faz» (mesmo bump 2.2) |
| `spec-code-audit` | `SKILL.md`, `templates/code-audit.template.md` | I.3, `GOLDEN_RULE_TRACEABILITY`, posição no pipeline e «O que NÃO faz» (mesmo bump 2.4) |
| `spec-security-review` | `scripts/inject-sec.mjs` | `--acrescentar` (com `--origem`): task SEC achada depois entra num backlog já revisado, sem refazer a revisão e sem substituir; o registro vai para `metadata.securityAdditions[]`, não para o `securityReview` — criar um `securityReview` ali faria a revisão de verdade, depois, ser recusada como reinjeção (mesmo bump 1.5) |

Testes: `inject-sec.test.mjs` (`--acrescentar`: entra em backlog revisado, não substitui, não
inventa `securityReview`, recusa junto com `--reprocessar`) e `onda5-decisoes.test.mjs` (a forma
escrita da regra nas três peças; o teste da Decisão 69 passou a fixar o GAP como o caminho do
«não»).

### Plano de melhoria das skills — Onda 6: ordem lógica do backlog e marca de regra de negócio (2026-10-20)

Pedido do mantenedor: o backlog lido e executado do primeiro ao último item nos quatro níveis, e o
item que é majoritariamente regra de negócio marcado — com a marca indo para o Azure DevOps.
Decisões tomadas com as propostas do plano (§6.5), reversíveis por configuração: tag
`regra-de-negocio` (`metadata.azureDevOps.businessRuleTag`), limite de 50%
(`metadata.businessRuleMark.threshold`), StackRank de item já existente só com `--reordenar`.

| Skill | Arquivo | Tipo de mudança |
|---|---|---|
| `spec-tasks` | `scripts/order-backlog.mjs` | **novo** — ordem nos quatro níveis: dependência (herdada pelos pais), camada (data → service → ui → integration → quality), etapa do flow-map, prioridade, `sequence` e ID; grava `executionOrder`/`layer`; reescreve os arrays na geração completa, não no `_change`; avisos `BACKLOG_ORDER_ACYCLIC`, `BACKLOG_DEPENDENCY_EXISTS`, `BACKLOG_LAYER_CHECK` |
| `spec-tasks` | `scripts/mark-business-rules.mjs` | **novo** — `businessRuleHeavy`/`businessRuleShare` (task: ≥ metade dos cenários provam RN — `relatedRules[]` ou `BUSINESS_RULE_VIOLATION`; demais níveis: > metade do esforço em tasks marcadas); `businessRuleOverride` com justificativa; aviso `BUSINESS_RULE_MARK_CONSISTENT` |
| `spec-tasks` | `templates/tasks.schema-atual.json` | campos **opcionais** `executionOrder`, `layer`, `businessRuleHeavy`, `businessRuleShare`, `businessRuleOverride` nos quatro níveis, e `dependencies` na Task (o schema não tinha, embora o serviço do ADO já lesse) |
| `spec-tasks` | `SKILL.md` | passo 13 roda os dois scripts antes dos validators; três WARNING novos; `version` 1.6 → 1.7 (nosso) |
| `spec-tasks-azure` | `azureDevopsService.js` | criação na ordem de `executionOrder`; `StackRank` = `executionOrder` (processo sem o campo → aviso uma vez, segue sem ele); links `Dependency-Reverse` num segundo passo, sem duplicar no `_change`; tag de regra em item marcado e removida, só ela, de item desmarcado; `--reordenar` |
| `spec-tasks-azure` | `lib/azure-upsert.mjs` | `removeTags` no merge de tags; `stackRank` no PATCH; `getLinkedIds`, `addDependencyLink`, `extractDependencyLogicalIds` |
| `spec-tasks-azure` | `lib/publish-plan.mjs`, `cli.mjs`, `SKILL.md`, `HISTORY.md` | o `--dry-run` mostra ordem, `StackRank`, dependências, tag que entra e tag que sai; flag `--reordenar`; seção «Ordem, dependências e marca»; WARNING `STACKRANK_UNSUPPORTED` e `DEPENDENCY_LINK_UNRESOLVED` (mesmo bump 3.4 da Onda 1) |
| `spec-tasks-html` | `lib/render-html.mjs`, `SKILL.md`, `HISTORY.md`, `package.json` | quatro níveis na ordem de `executionOrder`, selo `#N`, selo «Regra de negócio» e filtro que nunca esconde o pai de item marcado; `version` 6.2 → 6.3 (nosso) |

Não feito, de propósito: o número no título do work item (`[03] …`) — o plano o deixava opcional e
desligado por padrão, e mudar título de work item existente incomoda quem já trabalha nele.

Testes: `backlog-ordem-marca.test.mjs` (ordem e marca), `tasks-azure-dry-run.test.mjs` (paridade
simulação × publicação, agora com StackRank e links; processo sem StackRank; upsert tirando só a
tag) e `tasks-html-ordem-marca.test.mjs`. O `validate-examples.mjs` e o `test-consumer-compat.mjs`
da `spec-tasks` seguem verdes.

### Revisão de riscos do pacote — correções antes do commit (2026-10-21)

Uma revisão adversarial do pacote inteiro (o trabalho pendente e as Ondas 0–6) procurou o que podia
gerar artefato errado ou pior, causar dano fora do repositório ou bloquear sem motivo. O mantenedor
mandou corrigir antes do commit os itens 1 a 8, 12 e 13; os demais estão em «O que ficou pendente
no pacote 2.6.0», mais abaixo. Nenhuma skill subiu `version` de novo: todas as tocadas já tinham
subido neste pacote.

| Item | Skill / pasta | Arquivo | Tipo de mudança |
|---|---|---|---|
| 1 | `spec-estimate-report` | `templates/report-data.example.json` | **substituído** — exemplo sintético («Exemplo — Portal de Pedidos», 224 KB) no lugar do payload de um projeto de cliente (1,47 MB); corrige também `regrasNegocio` em texto e `enums[].valores` em objeto, que já renderizavam errado |
| 1 | `spec-estimate-report` | `SKILL.md`, `HISTORY.md`, `templates/report-data.schema.md`, `tests/regression.test.mjs` | exemplo fictício e as formas do schema; teste de coerência do exemplo, limiar de tamanho relativo e round-trip do payload (mesmo bump 1.3) |
| 1 | harness | `.gitignore`, `docs/` | os `.patch` e `.tgz` do registro (P10) ficam fora do git; nomes de cliente fora dos `.md` do registro; o teste 1.2 compara por hash, sem carregar os nomes, e varre também `docs/` |
| 2 | harness | `.azuredevops/pipelines/*.yml`, `templates/publicar-zip.yml`, `README.md` | os pipelines disparam **só na tag** `v<versao>`; o `verificar` confere que a tag é a versão do `harness.json` e que o commit está no `main`; o gate roda também a suíte de cada skill com `tests/` — ver "Gerar e publicar o zip" |
| 3 | `spec-scaffold` | `SKILL.md` | volta a ler todas as rules do projeto (a leitura dirigida deixava `auth`, `observability` e `integrations` de fora, e a tabela de cobertura tratava o tema como fora de escopo); lê as duas do harness explicitamente; **CRLF restaurado** — a Onda 4 o gravara em LF (Decisão 32) |
| 3 | `tools` | `vale-styles/README.md` | **CRLF restaurado** (a Onda 4 o gravara em LF) |
| 4 | harness | `.claude/rules/harness/frontend.md` | `paths:` cobre as mesmas extensões do `frontend-default.mdc` que ela substitui desde a Decisão 73 (`mjs`, `cjs`) |
| 4 | harness | `.claude/hooks/estado.test.mjs`, `.claude/ferramentas/gerar-kiro.mjs`, `gerar-cursor.mjs` | o teste deriva as extensões do `globs:` do `frontend-default.mdc` em vez de fixá-las; o remendo de cada gerador acompanha (na saída, o `fileMatchPattern` do Kiro e o `globs:` do Cursor são comparados com o mesmo conjunto) |
| 4 | `tools` | `references/task-pipeline.md` | §3: num projeto com o harness, a constituição de frontend e a `security` moram em `harness/` e quem gera tela as lê explicitamente |
| 4 | `spec-prototype`, `spec-convert-prototype` | `SKILL.md` | Passo 3.0 e a resolução da rule leem a constituição explicitamente (mesmos bumps 1.4 e 1.2) |
| 4 | `spec-tech-rules` | `templates/frontend.mdc` | o complemento do projeto remete também à constituição do harness, não só ao `frontend-default.mdc` que não é mais materializado (mesmo bump 4.4) |
| 5 | `spec-estimate-report` | `lib/aggregate.mjs` | o `--montar` casa cada nó pelo ID e preserva o que a IA escreveu (Definição de pronto, papéis, `rolloutWave`, casos de teste, enabler, fluxos); `regrasNegocio` como `{id, texto}`; `storiesNegocio` só conta USER_STORY |
| 6 | `spec-tasks-azure` | `lib/azure-upsert.mjs`, `azureDevopsService.js`, `lib/publish-plan.mjs`, `cli.mjs`, `lib/marcas-regra.mjs` (**novo**), `SKILL.md`, `HISTORY.md` | StackRank na criação = maior existente + `executionOrder` (antes ia para o topo; sem a base, sem StackRank e WARNING `STACKRANK_BASE_UNREADABLE`); `--reordenar` permuta os slots atuais; fallback do StackRank também no PATCH; a tag `regra-de-negocio` só sai de item que a ferramenta marcou (`ado-marcas-regra.json`) e tags comparadas sem caixa (mesmo bump 3.4) |
| 6 | `spec-tasks` | `scripts/mark-business-rules.mjs`, `SKILL.md`, `templates/tasks.schema-atual.json`, `HISTORY.md` | critério da marca que discrimina: natureza da task, RN própria e categoria do cenário — `relatedRules` sozinho não marca (mesmo bump 1.7) |
| 6, 7 | `spec-security-review` | `scripts/inject-sec.mjs`, `SKILL.md` | tasks SEC injetadas renumeradas na ordem (abrem a story; story transversal no início); leitura robusta do catálogo do kernel — `KERNEL_CONSUMED` cobra só CRÍTICO/ALTO em aberto, exit 2 com catálogo ilegível (mesmo bump 1.5) |
| 7 | `revisao-de-seguranca`, `auditoria-de-us` | `SKILL.md` | leem o `gaps.md` vivo do Plan (`outputs/spec/`); o do Explore só sem ele |
| 7 | harness | `.claude/ferramentas/preservacao-onda4.base.json` | hash da linha `KERNEL_CONSUMED` trocado — mudança de regra deliberada |
| 8 | `tools` | `merge-contract-delta.py`, `check-contracts.mjs` | REMOVED no nível do path tira o path inteiro; `operationType` aceito como sinônimo com AVISO; schema ALTER que perde propriedade/`required` gera AVISO; REMOVED não é cobrado no cruzamento |
| 8 | `spec-api-contracts` | `SKILL.md` | a marca é sempre `x-operation-type`; remoção do path inteiro; os AVISOs novos no D_change (mesmo bump 1.5) |
| 12 | harness | `.claude/hooks/escrita-bash.mjs`, `pretooluse.mjs` | a trava `escrita-powershell` lê o alvo de cada instrução (ver "No template a zona imutável é editável") |
| 13 | harness | `.claude/ferramentas/validar.mjs`, `validacao/*.mjs`, `.claude/agents/corretor.md` | G3: linha de base, escopo do grupo sem arquivo, Git Bash no Windows, saída do `parar`, registro do corretor lido, varredura, cota 5, `--cmd-build`, `medioEBaixo`, subpasta — ver "Revisão do G3 — 2026-10-21" |
| 13 | `spec-implement` | `SKILL.md`, `references/devolutiva.md`, `HISTORY.md` | G3 com a linha de base no E1, o `parar` com saída (comentário, devolutiva em falha, diff manter/descartar, lote espera), `--cmd-build`; e, do item 4, a constituição de frontend lida explicitamente no «Resolve rules location» (mesmo bump 2.4) |

Testes: `skills-correcoes.test.mjs` (1.2 por hash, item 4, 7b), `preservacao.test.mjs` (spec-scaffold e
CRLF), `estado.test.mjs` (extensões da rule de frontend derivadas do `frontend-default.mdc`),
`estimate-report-agregador.test.mjs` e `tests/regression.test.mjs` da skill,
`tasks-azure-dry-run.test.mjs`, `backlog-ordem-marca.test.mjs`, `inject-sec.test.mjs`,
`onda5-decisoes.test.mjs`, `tasks-html-ordem-marca.test.mjs`, `contrato-delta.test.mjs`,
`check-contracts.test.mjs`, `escrita-bash.test.mjs`, `validacao.test.mjs`, `varrer-entrega.test.mjs` e
`.azuredevops/pipelines/scripts/pipelines.test.mjs`.

### Teste ponta a ponta — correções ALTA e MÉDIA (2026-10-21)

Um agente fez o papel de consultor e de cliente e levou um projeto fictício pequeno («Portal de
Pedidos»: 3 módulos, 9 RF, 9 RN, 5 telas, 11 endpoints, 2 épicos, 8 histórias, 16 tasks) do briefing
à primeira US implementada e auditada, rodando as 29 skills. Achou 64 defeitos: 2 ALTA, 23 MÉDIA e
39 BAIXA. O mantenedor mandou corrigir os ALTA e os MÉDIA — inclusive os que já existiam antes deste
pacote —; os BAIXA estão em «O que ficou pendente no pacote 2.6.0». Cada correção tem teste que
falhava antes e passa depois.

| Defeito | Skill / pasta | Arquivo | Tipo de mudança |
|---|---|---|---|
| D1 (ALTA) | harness | `.claude/hooks/kit.mjs` | `frame.md` e `frame/` na `WHITELIST_EXPLORE`: a `spec-frame` não conseguia gravar a própria saída no Explore e o `estado` passava a dizer «Plan» |
| D2 | harness | `.claude/rules/harness/explore.md`, `plan.md` | a `spec-frame` é acelerador opcional do Explore, antes da `spec-ingest`, para pedido vago; a Decisão 71 a tirou do fluxo **padrão**, não a proibiu; o `plan.md` diz «Não roda no Plan» e aponta o `explore.md` |
| D8 | harness | `.claude/hooks/fecho-explore.mjs`, `explore.md`, `templates/gaps.md` | sem `modelo-de-dados.md` o fecho exige a linha de dispensa no `gaps.md` (arquivo, motivo, quem decidiu, data — placeholder não conta) e a mensagem ensina a linha |
| D9 | harness | `kit.mjs`, `fecho-explore.mjs`, `explore.md` | o fecho lê a fidelidade declarada no `prototype.md`: só Alta passa; não declarada ou menor nega e aponta a isenção. Protótipo regerado em fidelidade menor no Plan também nega |
| D12 | harness | `.claude/ferramentas/promocao.mjs`, `plan.md` | âncora `<arquivo> §<seção>` para seção sem ID (personas, telas, especificação técnica) é rastreável quando a seção existe |
| D14 | harness | `kit.mjs`, `promocao.mjs`, `plan.md` | `RN-NOVO-<DOMÍNIO>-nnn` é reconhecido (antes só `RN-NOVO-nnn`); a promoção lê também a linha Origem do `business-rules.md` — oito caminhos lidos |
| D53 | harness | `.claude/hooks/workspace.mjs`, `estado.mjs`, `templates/workspace.md`, `explore.md` | repositório `codigo` ou `prototipo` aninhado no de docs gera aviso no `--validar` e no início da sessão; o layout suportado (pastas irmãs) está documentado. **Suporte ao aninhado não foi feito**: exige mudar a classificação de papel do `delivery-gate`, que é bloqueante |
| D10 | `spec-prototype`, `tools` | `templates/prototype.md`, `check-modules.py`; `hooks/revisao.mjs` | o template diz «código do módulo» em vez do literal `MOD-XXX`; os dois verificadores ignoram `MOD-XXX`/`MOD-EXEMPLO*`/`MOD-CODIGO` no texto livre (no título `## Módulo:` e no campo da RN continua acusado: é campo do template não preenchido) |
| D16 | `spec-iterate`, `tools` | `SKILL.md`, `extract-gaps.py` | a ponte dos GAPs do Explore para o Plan: na primeira rodada os abertos são importados com o mesmo número e `Origem`; o `extract-gaps.py` lê `outputs/explore/gaps.md`, conta cada GAP uma vez e lista os abertos não importados; FATAL `EXPLORE_GAPS_IMPORTED`; `version` 1.3 → 1.4 (nosso) |
| D65 | `spec-scope-change` | `SKILL.md`, `templates/scope-change-analysis.md` | a auditoria de regressão lê o estado das tasks e o `spec_story.md` dos módulos afetados e lista o código já entregue que a mudança toca; WARNING `SPEC_STORY_ABSENT`; `version` 1.2 → 1.3 (nosso) |
| D33 (ALTA) | `spec-tasks`, `spec-test-plan`, `spec-implement` | `SKILL.md`, `templates/tasks.schema-atual.json`, `scripts/validate-tasks-business.mjs` | a frase do `coverageNote` vira «Cobre TC-NNN do plano de testes»: com o nome do arquivo ela era reprovada pelo próprio `NO_EXTERNAL_REFS_IN_TASKS`. A allowlist **não** foi afrouxada — o caminho do arquivo já vai em `externalReferences` |
| D29 | `spec-tasks` | `scripts/validate-tasks-selfsufficiency.mjs`, `scripts/lib/technical-contracts.mjs`, `templates/validate-examples.mjs`, `references/validators.md` | os gates de presença reconhecem a rota e a tabela que existem no `api-contracts.yaml` e no `data-model.json` do projeto, citadas em contexto inequívoco (verbo HTTP, `"path"` de cenário, SQL, `tabela.coluna`), e não só `/vN/…` e `tb_…`; o bloco «gatilhos do projeto» é idêntico no script e na lib, e o `validate-examples` confere. Em task `security` a citação que só o projeto reconhece é WARNING: o `inject-sec` não embute contrato e recusaria a injeção |
| D30 | `spec-tasks` | `scripts/lib/technical-contracts.mjs` | o conversor lê o YAML que a `spec-api-contracts` escreve: resolve `$ref` e aceita o `security` global como auth; 5xx não declarado vira aviso (2xx, 4xx, auth e request continuam FATAL) |
| D31 | `spec-tasks` | `scripts/validate-tasks-selfsufficiency.mjs` | `body` só é exigido quando a operação tem `requestBody` no contrato; transição de estado sem corpo passa |
| D34 | `spec-tasks` | `scripts/validate-tasks-business.mjs`, `references/tipos-operacionais.md` | story só com tasks `class=spike` é SPIKE e sai dos gates de narrativa de negócio; os gates estruturais do SPIKE continuam |
| D39 | `spec-tasks`, `spec-security-review` | `scripts/order-backlog.mjs`; `SKILL.md`, `scripts/inject-sec.mjs` | `mustImplementFirst` é o critério 0 da ordem, sem violar dependência explícita; o Passo E da `spec-security-review` termina rodando o `order-backlog` (que respeita a renumeração do `inject-sec`) |
| D52 | `spec-tasks` | `scripts/lib/business-enrichment.mjs`, `scripts/lib/source-docs.mjs` | o critério de aceite derivado do BDD sai como oração («quando o vendedor…»), nunca «ao o vendedor…» |
| D48 | `spec-implement`, harness | `SKILL.md`, `HISTORY.md`; `.claude/ferramentas/andamento.mjs` (**novo**) | `andamento.mjs conferir` antes de começar (dependência aberta, `mustImplementFirst`, níveis acima → pergunta) e `concluir` no fim do G3 aprovado (grava `status: "DONE"` só em Mode B; em Mode A o estado é do Azure DevOps); § D2 e § H (Mode B); FATAL `DEPENDENCIES_CHECKED`, `TASK_STATUS_RECORDED`; WARNING `DEPENDENCY_PENDING` (mesmo bump 2.4) |
| D49 | `spec-implement`, harness | `SKILL.md`; `.claude/rules/harness/deliver.md`, `templates/em-andamento.md` | quem cria o marcador da US: a `spec-implement`, com `andamento.mjs abrir-us`, no repositório de docs; quem apaga: a `auditoria-de-us` (`MARKER_CLEARED`); FATAL `US_MARKER_OPEN` |
| D55 (ALTA no G3) | harness | `.claude/ferramentas/validacao/varredura.mjs` | `CHANGE_ME` é placeholder; em `*.example`/`*.sample`/`*.template` só é achado valor com cara de segredo gerado; leitura de arquivo e script de migração/seed saem do `io-no-laco`. Tudo isso bloqueava o G3, a auditoria da US e a do repositório |
| D54 | `spec-code-audit`, harness | `SKILL.md`; `.claude/ferramentas/varrer-entrega.mjs` | a skill passa `--repo <pasta do papel codigo>`; o `--tudo` numa pasta sem código-fonte sai com exit 2 em vez de «0 achados» (`outputs/`, `.claude/` e `inputs/` não contam) |
| D59 | `spec-estimate-report` | `lib/aggregate.mjs`, `lib/load-data.mjs`, `templates/report-data.schema.md`, `HISTORY.md` | o `--montar` monta `caminhoCritico.gargalos` do `estimate-calc.json` (a aba Estimativa quebrava com TypeError); campo que o shell lê sem proteção vira `AVISO: CAMPO_OBRIGATORIO` (mesmo bump 1.3) |
| D37 | `spec-estimate` | `forecast.mjs`, `SKILL.md` | cross-check bottom-up × top-down calculado: `(P50 × frentes) ÷ (Σ esforço manual ÷ horas/dia)`; avisos `HEADCOUNT_SANITY` fora de 0,5×–2× e `NO_EFFORT_BASELINE`; campo `crossCheck` no `estimate-calc.json` |
| D27 | `spec-test-plan`, `tools` | `check-testplan.mjs`, `SKILL.md` | a cobertura conta só as RN com bloco próprio no `business-rules.md`; a RN do Explore citada como Origem vai para `rns.promovidas` |
| D46 | `spec-tech-rules` | `tools/check-rules.mjs`, `SKILL.md` | achado `RULES_CONTRADICTION`: módulo citado numa rule ou no `data-model.json` fora da `architecture.mdc`; «sem dependências de runtime» com banco que precisa de driver |

Versões: `spec-iterate` 1.3 → 1.4 e `spec-scope-change` 1.2 → 1.3, as duas (nosso); as demais skills
tocadas já tinham subido neste pacote e registram a mudança no `HISTORY.md` (`spec-tasks` 1.7,
`spec-implement` 2.4, `spec-estimate-report` 1.3). Quatro linhas normativas de
`spec-tasks/references/validators.md` mudaram de propósito (D29–D31): os hashes foram trocados na
`.claude/ferramentas/preservacao-onda4.base.json`.

Testes novos: `tasks-correcoes-e2e.test.mjs`, `modulo-placeholder.test.mjs`,
`gaps-explore-plan.test.mjs`, `scope-change-regressao.test.mjs` (em `.claude/hooks/`) e
`andamento.test.mjs` (em `.claude/ferramentas/`). Ganharam casos: `kit`, `fecho-explore`, `estado`,
`workspace`, `promocao`, `onda5-decisoes`, `composicao`, `check-testplan`, `estimate-forecast`,
`tech-rules-check`, `estimate-report-agregador`, `validacao` e `varrer-entrega`.

### O que ficou pendente no pacote 2.6.0

Os documentos de trabalho do plano de melhoria (plano, achados da Onda 0, registro item a item,
decisões pendentes, roteiro para o Eng_Proc e as evidências `.txt`) saíram do repositório no PR da
2.6.0. Esta seção é agora o dono das pendências: o que segue não foi feito, por decisão do
mantenedor ou por depender de projeto real. ✔ = reproduzido ou provado lendo o código; ? = análise,
não medido.

**Decisões e entregas ao Eng_Proc**
- Onda 4: oferecer a reorganização dos SKILL.md ao Eng_Proc (cada entrega nova do kit pede merge
  nesses arquivos e nas `references/`). A execução de cada skill num projeto antes e depois (P6) não
  foi feita — a conferência foi estrutural (`preservacao.mjs`).
- Onda 6: a ordem lógica e a marca de regra de negócio mudam três skills do upstream (`spec-tasks`,
  `spec-tasks-azure`, `spec-tasks-html`); levar ao Eng_Proc.
- Onda 3: os sete scripts entraram como WARNING; promover a FATAL depois de rodar sem falso positivo
  em projeto real.
- Decisões 69 e 74: a criação da task SEC pelo MCP do Azure DevOps nunca rodou contra um projeto de
  verdade; os agentes `validador-*` com escopo de US e de repositório não foram feitos.
- Nomes de cliente: trocados daqui em diante; continuam no histórico do git e no zip 2.5.0.
- Para o Eng_Proc (relatório, não PR): a numeração de fases (`node .claude/ferramentas/relatorio-fases.mjs`
  gera a lista); as inconsistências do método da `spec-estimate` (seção da Onda 3); o `siblingUrl()`
  do `test-consumer-compat.mjs` monta `file://` sem codificar e quebra em pasta com `%`; `description`
  acima de 1.024 caracteres em `auditoria-de-us` (1.114), `spec-security-review` (1.059) e
  `spec-test-plan` (1.052).

**Revisão de riscos (2026-10-21) — itens não corrigidos**
- Item 9, instrução atrás de ponteiro (Onda 4): ? o modo expresso da `spec-tech-rules` pula o PASSO 2,
  que é quem manda ler `references/kickoff-blocos.md`; ✔ o `check-rules.mjs` não acusa bloco
  `{{#if}}`/`{{else}}`/`{{/if}}` que sobrou; ✔ o `TASK_SELF_SUFFICIENT_CHECK` da `spec-tasks` ficou só em
  `references/validators.md`, atrás de um ponteiro que não dispara; ? no `_change` da `spec-tasks` o
  nome do arquivo complementar só está em `references/modo-change.md`; ✔ o `PronomesVagos` do Vale
  some com `MinAlertLevel = warning`; ✔ a `spec-report` ainda diz «a tabela abaixo é a fonte de
  verdade» com a tabela no `MAINTENANCE.md`; ✔ a `spec-legacy` diz «abaixo» de conteúdo que foi para
  `references/`.
- Item 10, números que mudam de significado: ✔ o `SKILL.md` da `spec-estimate` (~l.743) ainda descreve
  `duration = CU × hours_per_CU (5)`, que o `forecast.mjs` não usa; ✔ «Bugs por módulo» da
  `spec-status-report` conta `Removed` como fechado; ✔ «Bugs por semana» em America/Sao_Paulo e os
  outros gráficos semanais em UTC.
- Item 11: ? a `spec-convert-prototype` mudou os artefatos de `docs/` para
  `outputs/spec/convert-prototype/` sem nota de migração.
- Item 14, Decisões 69 e 74: ✔ responder «não» à task SEC deixa a US bloqueada no `delivery-gate`; ? work
  item duplicado (título `SEC-NNN —` do MCP × fallback `SEC-NNN:`); ? colisão de numeração SEC entre a
  auditoria e a `spec-security-review`; ? a regra não diz qual organização/projeto do MCP usar.
- Item 15: ✔ passar de fase na mesma sessão não injeta a rule nova; ✔ `estado.mjs` que falha deixa a
  sessão sem rule e sem aviso; ? os subagentes da `spec-legacy`, `spec-convert-prototype` e
  `spec-debug-fix` não citam a rule; ? o `paths:` entre aspas só foi medido no Claude Code 2.1.295.
- Item 16, Cursor e Kiro: ✔ no Cursor todo comando chega como Bash e a trava de PowerShell não vale;
  ✔ a `spec-tech-rules` oferece no Cursor e no Kiro opções que gravam onde a ferramenta não lê; ✔ quem
  atualiza o Kiro de 2.5.0 para 2.6.0 fica com `.kiro/fases/harness-frontend.md` velho e reprova no
  `verificar-zona`; ✔ personalizar `.claude/settings.json` ou `.cursor/hooks.json` reprova o PR do
  projeto; ? o frontmatter `.mdc` nunca rodou num Cursor real.
- G3 (item 13), o que ficou de fora: ✔ a `auditoria-de-us` registra MÉDIO como débito mas não propõe a
  `SEC-NNN`; a linha de base não prova o momento em que foi tirada; `catch` que só mostra `toast`
  bloqueia; JSON-LD com `JSON.stringify` não escapa `</script>`; `.vue`/`.svelte` não contam como tela.
- Menores: ✔ copiar uma skill do harness para pasta nova passa como extensão do projeto com o mesmo
  `name`; ✔ o `delivery-gate` não olha a tool PowerShell; a rule de frontend cobre `.mjs`/`.cjs` e, no
  template, carrega ao ler um hook (~4 mil tokens por sessão de manutenção); o README dos pipelines diz
  Node 22.x e o YAML usa 24.x; ✔ no Windows o `doutor.mjs` diz que faltam o Claude Code e o npm
  instalados (`spawnSync` sem shell não executa `.cmd`); o shell congelado da `spec-estimate-report`
  tem títulos fixos do projeto de referência; o `--montar` emite o bloco `seguranca` em toda task.

**Teste ponta a ponta (2026-10-21) — defeitos leves, não corrigidos**

O projeto fictício «Portal de Pedidos» rodou as 29 skills do briefing à primeira US auditada. Os 2
defeitos ALTA e os 23 MÉDIA foram corrigidos (seção anterior); estes ficam:

| ID | Onde | O que acontece |
|---|---|---|
| D3 | `tools/check-outputs.py` × `legacy-sem-legado.md` | o `legacy.md` do caminho «sem legado» é acusado de raso (≥80 linhas) |
| D4 | `spec-frame`, `spec-ingest`, `spec-legacy` | descrevem a linha do sync-log com 7 colunas; o template tem 9 |
| D5 | `spec` × `spec-ingest` × `legacy-sem-legado.md` | processo manual descrito em ata não tem classificação única de legado |
| D6 | `spec-benchmark`, Passo 7 | não prevê empate nos dois eixos do mapa 2×2 |
| D7 | `spec-benchmark`, `spec-prototype` («Skills irmãs») | numeração de fases diferente do `task-pipeline.md` |
| D11 | `spec-prototype`, Passos 3.1.5 e 4 | fidelidade Média sem status «desenhada»; coluna HU manda `PD-xxx` no Explore |
| D13 | `promocao.mjs` | «Li 4 de 5 documentos» com o modelo de dados dispensado não é nenhuma das causas |
| D15 | `check-modules.py`, `check-flowmap.py` | saída em cp1252 no Windows com stdout redirecionado |
| D17 | `spec-product` 4.5 × `spec-iterate` | o lint de prosa varre listas de arquivos diferentes |
| D18 | `spec-tech-rules/templates/frontend.mdc` | o `paths:` gerado casa todo `.js` do backend |
| D19 | `spec-tech-rules`, modo expresso | «2 turnos», mas o Turno 1 cobre 40+ decisões sem dizer quais vêm do perfil |
| D20 | `spec-hld` (`EXTERNAL_SYSTEMS_ADDRESSED`) | ferramenta informal do context-map cobrada como sistema externo, por nome exato |
| D21 | `revisao-de-seguranca` | modelo de dados dispensado passa sem WARNING |
| D22 | `revisao-de-seguranca` × `CLAUDE.md` | a skill lê o `gaps.md` vivo do Plan; o `CLAUDE.md` ainda aponta o do Explore como dono |
| D23 | `spec-data-model` (stub e schema) | `paths.rulesRoot` padrão `.cursor/rules` em projeto Claude |
| D24 | `validate-data-model.mjs` | sem `ajv` o gate só chega a «REDUZIDA» e a rota `npx` baixa pacote |
| D25 | `spec-api-contracts` | não diz se o `/v1` mora no path ou em `servers[].url` |
| D26 | `spec-api-contracts` × `spec-tech-rules` 7.4 | `Idempotency-Key` exigida mesmo com a rule desligando idempotência |
| D28 | `spec-test-plan` | sem formato compacto (41 TC ≈ 1.300 linhas) |
| D32 | `spec-tasks`, `spec-iterate` (templates de gaps) | os dois começam em GAP-001 em vez de continuar a numeração |
| D35 | `spec-security-review` × `mark-business-rules.mjs` | a marca de regra muda depois do `inject-sec` e ninguém manda recalcular antes de publicar |
| D36 | `spec-security-review` (E.0-K) | sem régua de esforço para decidir se um MÉDIO vira task |
| D38 | `forecast.mjs` | tasks de segurança e de investigação entram com `cu: 0` |
| D40 | `spec-tasks-html/lib/render-html.mjs` | a leitura de cima para baixo não é a ordem de execução (`#1 #2 #4 #5 #3`) |
| D41 | `inject-sec.mjs` × `publish-plan.mjs` | título «SEC-001: SEC-001 — …» com o ID duas vezes |
| D42 | `publish-plan.mjs` | tag `parent-epic:` com o epic padrão em vez do epic real |
| D43 | `promocao.mjs --congelar` | modelo de dados dispensado aparece como «sumiu do disco» |
| D44 | template do `gaps.md` do Explore | link morto para `modelo-de-dados.md` dispensado |
| D45 | `spec-scaffold` | propõe `src/` sem ler o papel `codigo` do `workspace.md` nem tratar vários containers |
| D47 | `spec-tech-rules/templates/*.mdc` | `{{LAYERS_TABLE}}` repete o cabeçalho que o template já tem |
| D50 | `estado.mjs` × `em-andamento.md` | branch e HEAD aparecem «—» e «0 arquivos» sem ler o git |
| D51 | `validar.mjs` | `--sem-agentes` termina com o mesmo `APROVADO` do ciclo completo |
| D56 | `rastreio-sec.md` | número de SEC proposto não é reservado; duas auditorias propuseram o mesmo |
| D57 | `spec-debug-fix` | a lista de artefatos e o template divergem sobre `flow-map.md` e `instrumentation.md` |
| D58 | `tools/generate-report.py` | mensagens em cp1252 no Windows |
| D60 | `spec-estimate-report/cli.mjs` | `meta.totais.diasEsforco` não é montado nem conferido |
| D61 | `report-shell.html`, aba 07 | ponto duplicado depois de `calibracaoNota` |
| D62 | `spec-status-report/lib/collect-docs.mjs` | seção só com tabela devolve `---` como enunciado da regra |
| D63 | `spec-status-report` | o título do relatório vem do título do `product-vision.md` |
| D64 | `spec-status-report` | cobertura do `node:test` dada como indisponível sem o `c8` |
| D66 | `spec-scope-change/templates` | `generated-by` v1.2 e rodapé v1.0 com a skill na 1.3 |

## Ferramenta bifurcada: `tools/generate-report.py` — Plano 5, Task 8

É a primeira vez que este harness edita **código** do upstream, e não prosa. O `diff -rq` a mostra do
mesmo jeito que uma skill bifurcada — um arquivo que difere dos dois lados —, mas reconciliar é merge
de Python, não de markdown: ao aplicar o passo 2 sobre este arquivo, rode
`node --test .claude/hooks/report-dominios.test.mjs` **antes e depois** — ele é a prova de que os dois
domínios sobreviveram à entrega (e precisa de `PYTHON_REPORT` apontando para um Python com o pacote
`markdown`; sem isso o teste falha dizendo exatamente isso). O que mudou: `build_review_domain` (nova,
domínio `revisao` por presença de `revisao.json`), `build_tech_domain` (presença e capítulo por
`tech-rules-summary.md`), `main()` (a montagem) e a docstring. `REPORT_VERSION` **não** mudou, de
propósito: shell e CSS não foram tocados e o `report-shell.html` não conhece nomes de domínio, logo
domínio novo montado por presença não quebra template antigo.

A bifurcação de conteúdo da própria skill `spec-report` entra aqui junto, porque é a mesma mudança:

| Arquivo | Tipo de mudança |
|---|---|
| `tools/generate-report.py` | editado — `build_review_domain` (nova), `build_tech_domain` (condição de presença + capítulo «Regras técnicas»), `main()` (construção e montagem), docstring |
| `spec-report/SKILL.md` | editado — `description` do frontmatter, nota de versão única, tabela de domínios (linha do Técnico + linha nova da Revisão), `DOMAIN_CONDITIONAL`, skills irmãs; `version` 3.0 → 3.1 |
| `spec-report/MAINTENANCE.md` | editado — cenários de degradação 6 e 7 (com e sem `revisao.json`) e o contrato de versão única |

## Duas ferramentas do upstream que a nossa cópia NÃO tem

O pacote entregue traz só `skills/` e os manifestos (`.claude-plugin/`, `CLAUDE.md`) — sem
`scripts/` na raiz. Faltam as duas que o próprio `CLAUDE.md` do upstream e os `SKILL.md` citam:

- **`scripts/lint-package.py`**, o gate de qualidade deles ("o único script que sobrou", regras
  L01–L09), rodado nos pipelines e antes de abrir PR **no repositório do upstream**. Não nos afeta:
  é gate do pacote deles antes de sair; nós não abrimos PR lá.
- **`scripts/apply_linguagem_clara.py`**, que o bloco canônico `<!-- linguagem-clara:v1 -->`
  (presente em 26 das skills compartilhadas) manda rodar *"ao alterar, para replicar em todas as
  skills"*. **Nos afeta:** editar esse bloco na nossa cópia significa replicá-lo à mão nas skills
  que o carregam, ou decidir que não replicamos. **Fechada no Plano 5 (Decisão 42): replicamos à
  mão, e o `skills-prosa.test.mjs` cobra a identidade.**

**Divergência com uma versão anterior deste levantamento:** não é `setup.py sync` gerando os
espelhos `.cursor/skills`/`plugin/skills`. O próprio `spec-init/SKILL.md` do pacote rotula
`scripts/setup.py` como **LEGADO (removido)** — os blocos que ele escrevia (`ENG-PROC:*`,
`AUTO-RULES:*`) não têm mais ferramenta que os mantenha; quem gera os espelhos hoje são os
pipelines de CI do upstream (branch `plugin-dist`, artifact `.zip` para Cursor), não um comando
local. `setup.py` não existe no pacote entregue.

## O diretório vazio `spec-tasks-html/scripts` — artefato do git, não bifurcação

O `diff -rq` do passo 3 mostra uma linha que **não** é diferença nossa e que não exige ação:

```
Only in '.../Elo-spec-kit <data>/skills/spec-tasks-html': scripts
```

`spec-tasks-html/scripts/` existe no pacote e está **vazio** — é o único diretório vazio do pacote
inteiro (`find "<pacote>/skills" -type d -empty`). O `cp -r` da vendorização o copiou; o git não
versiona diretório vazio, então ele não sobreviveu ao commit e nenhuma worktree o recria. Nada foi
apagado e nada está faltando: não há arquivo dentro dele, nem no pacote nem no histórico, e nenhum
`SKILL.md` da nossa cópia aponta para lá.

**Não é o caso do passo 4 do merge** (sobra que o upstream removeu e o `cp -r` não apaga): a direção
é a oposta — o pacote tem, nós não. Não apague nada e não crie o diretório. Se uma entrega futura
puser um arquivo dentro dele, o `cp -r` do passo 3 o traz junto e a linha `Only in` some sozinha.

## Gerar e publicar o zip

O pacote que o consultor recebe é um `.zip` do `HEAD` do `main`, gerado pela ferramenta
`node .claude/ferramentas/empacotar.mjs`, e publicado na pasta compartilhada. O guia do usuário não
mora neste repositório: é construído e distribuído à parte.

**Quem publica são os pipelines, e quem os dispara é a tag.** Três pipelines do Azure DevOps, em
`.azuredevops/pipelines/`, um por runtime: Claude Code (`empacotar.mjs`), Cursor
(`gerar-cursor.mjs`) e Kiro (`gerar-kiro.mjs`). Eles disparam **só na tag anotada `v<versao>`**
posta num commit do `main` — commit em branch, inclusive no `main`, não roda pipeline de
publicação. Cada run lê `nome` e `versao` do `harness.json`, confere que a tag do run é `v<versao>`
daquele `harness.json` e que o commit dela está no `main`, e pergunta ao SharePoint se o zip daquela
versão já existe. Se existe, termina verde sem fazer nada; se não existe, roda a suíte inteira (a do
harness e a de cada skill que tem `tests/`), gera o zip, guarda-o como artifact do run e o sobe para
a biblioteca **ELO Tech Advisory › General › 1. Estratégia e Metodologia › 3. Harness Engineering ›
Harness Compartilhado**. Configuração (app registration, variable group) e o detalhe de cada run
estão no `README.md` daquela pasta.

**Por que a tag, e não o merge** (revisão de riscos de 2026-10-21). Quando o merge no `main`
publicava sozinho, o PR que subia a versão já era a publicação, sem gesto humano — e a Camada I da
`security.md` exige aprovação humana antes de deploy. Os três pipelines também corriam soltos: se o
do Claude publicava e o do Cursor falhava, um commit de correção sem bump publicava o Cursor de um
commit e o Claude de outro, com o mesmo número; e dois commits seguidos disputavam a mesma versão.
Com a tag, a publicação é um ato explícito, e os três zips saem do mesmo commit.

**O que não viaja.** O zip é `git archive` do `HEAD`: por padrão, **tudo o que está versionado aqui
vai para a pasta do consultor**. A `EXCLUSOES` do `empacotar.mjs` é a lista do que fica de fora —
hoje `docs/`, `.superpowers/` e `.azuredevops/` (baseline do repositório no ADO e os pipelines de
publicação, Plano 10), o registro e a governança de quem projeta o harness. Duas consequências
práticas: registro novo que precise ser versionado **neste** repositório entra nessa lista no mesmo
commit, e `docs/` em especial nunca volta a viajar, porque na pasta do consultor `docs` é o nome do
papel do repo que vira wiki (`workspace.md`) — uma `docs/` nossa colidiria com a dele. O registro
das verificações de primeiro dia saiu daqui em 2026-09-21 e vive no repositório de documentos, em
`docs/execucao/verificacao/verificacoes-primeiro-dia.md`.

**Zip publicado não se sobrescreve.** As versões anteriores ficam na pasta: nunca se sobrescreve nem
se apaga um zip publicado — versão com defeito recebe versão nova. Quem precisa da mais nova pega o
número maior. O script de publicação sobe com `conflictBehavior=fail`, e um conflito vira recusa.

**Os passos, em ordem:**

1. **Subir a versão e registrar a linha, no PR.** Toda mudança no que o zip carrega sobe a `versao`
   (Decisão 56): **patch** para correção de texto, **minor** para mudança de comportamento ou
   arquivo novo, **major** para mudança de modelo. A versão vive em um só lugar:
   `versao` do `harness.json`. No mesmo PR, acrescente a linha da versão à tabela
   **Versões publicadas**, abaixo: a coluna da tag é o nome `v<versao>`, que o git resolve para o
   commit (`git rev-parse v2.1.0`), e por isso a linha pode ser escrita antes do commit existir.
2. **Suíte inteira verde no PR**, com `PYTHON_REPORT` apontando para o venv que tem o pacote
   `markdown` (ver "Rodar os testes" no `README.md`). O pipeline roda a suíte de novo antes de gerar
   e não publica com ela vermelha, mas descobrir isso depois do merge custa um commit de correção
   no `main`.
3. **Merge no `main`.** O merge **não publica**: nenhum pipeline de publicação roda em commit de
   branch.
4. **Tag no commit de merge — é ela que publica.** Uma tag anotada no commit de merge do `main`:
   `git tag -a v2.1.0 <sha-do-merge> -m "harness-elo-v2 2.1.0"` e `git push origin v2.1.0`. O push da
   tag dispara os três pipelines. Acompanhe os três runs até o fim: cada um tem de terminar verde
   **e** ter passado pelo job `publicar` (um run que parou no `verificar` com o aviso "já está
   publicado" não publicou nada). A tag é o que diz, meses depois, exatamente o que um zip carregava,
   e **os pipelines não a criam**: ela é o passo humano que aprova a publicação e prende os três zips
   ao mesmo commit. O `verificar` recusa tag que não seja `v` + a `versao` do `harness.json` daquele
   commit e tag num commit fora do `main` (tag no commit do branch do PR é tag no commit errado —
   apague-a e recrie no commit de merge). Run que falhou por ambiente (rede, credencial) roda de novo
   pela mesma tag; defeito no pacote pede versão nova.
5. **Conferir como o consultor confere.** Baixe o zip publicado (do SharePoint ou do artifact `zip`
   do run), extraia numa pasta vazia, leia o `README.md`, rode
   `node .claude/ferramentas/doutor.mjs`, abra uma sessão do Claude Code na pasta e leia a primeira
   mensagem: a versão nela tem de ser a do `harness.json`. É a Instalação do `README.md`, seguida à
   letra.
6. **Confira a linha da tabela** abaixo contra os arquivos publicados — nome e versão batem. Se a
   data de publicação for outra que a da linha, corrija a data na tabela num commit próprio, que
   **não** sobe versão: a tabela é registro, não conteúdo do pacote… e por isso mesmo a coluna da
   tag, e não um SHA, é o que prende a linha ao conteúdo. Esse commit não dispara pipeline: só tag
   publica.

**Contingência: publicar à mão.** Só quando os pipelines não podem rodar (ADO fora, credencial do
SharePoint revogada). Na sua cópia do template (o `.harness-template` existe na raiz), no `main`
atualizado, com a árvore limpa e a suíte verde. **Worktree de plano não empacota**: o `main` é a
única fonte do zip. Com `<dir>` apontando para uma pasta **fora** do repositório (a ferramenta
recusa destino dentro da árvore):

```bash
node .claude/ferramentas/empacotar.mjs --saida <dir>
```

Sem `--saida` ela só relata o que faria. Ela recusa: fora do template (Decisão 59); `harness.json`
sem `nome` ou sem `versao` X.Y.Z; árvore suja; tag da versão em outro commit; `.git/`,
`.harness-template` ou `node_modules/` na árvore; `harness.json`, `CLAUDE.md` ou
`.claude/settings.json` ausentes; zip já existente no destino; pasta de saída inexistente. Se o
`git archive` falhar depois de abrir o arquivo, ela apaga o que sobrou e recusa. O mesmo vale se o
arquivo gerado não passar na releitura (vazio ou sem `PK`). Passando, gera
`harness-elo-v2-<versao>.zip`, relê o arquivo (tamanho e assinatura `PK`) e imprime nome, versão,
SHA e contagem de entradas. Ou o zip completo existe e passou, ou não existe. Os zips do Cursor e
do Kiro saem dos geradores ("Gerar a versão Cursor" e "Gerar a versão Kiro", abaixo): apague o
`.git/` da saída e zipe o conteúdo, sem a pasta de cima, como `harness-elo-v2-cursor-<versao>.zip`
e `harness-elo-v2-kiro-<versao>.zip`. Copie os zips para a pasta compartilhada, sincronizada na
máquina de quem mantém como
`C:\Users\<usuário>\EloGroup\ELO Tech Advisory - General\1. Estratégia e Metodologia\3. Harness Engineering\Harness Compartilhado`,
onde convivem com o do kit (`eng-proc-spec-plugin-v5.zip`), crie a tag do passo 4 e siga os passos 5
e 6. Quando os pipelines voltarem, o run daquela tag encontra a versão publicada e para no
`verificar` — não há o que desfazer.

**O que não se faz:** gerar zip de worktree de plano; editar um zip depois de gerado; apagar ou
sobrescrever zip publicado; empacotar sem a suíte verde; pôr a tag num commit que não seja o de
merge do `main`.

**O que a ferramenta não faz, de propósito:** o `empacotar.mjs` não roda a suíte (três minutos, e
o `PYTHON_REPORT` é da máquina), não faz bump, não cria tag, não publica. No pipeline, a suíte e a
publicação são passos do YAML em volta dele; o bump e a tag continuam humanos. A ferramenta é o
passo do meio — o que uma pessoa erra: nome com versão velha, árvore com correção não commitada,
marcador de template viajando.

O `empacotar.mjs` exige **Git ≥ 2.35** (`git archive --add-file`, que põe o manifesto no zip); com Git
mais velho recusa com `git-antigo`, antes de escrever qualquer coisa. Falha ao montar o manifesto
recusa com `manifesto-falhou`, sem chegar ao `git archive`.

### Versões publicadas

| Versão | Data | Tag | O que mudou |
|---|---|---|---|
| 2.1.0 | 2026-09-11 | `v2.1.0` | primeira versão publicada como zip: `GUIA.html` na raiz e na zona imutável; `guia.test.mjs`; `empacotar.mjs`; README, CLAUDE.md e doutor sem `git clone`; procedimento de publicação neste documento |
| 2.2.0 | 2026-09-18 | `v2.2.0` | gerador da versão Kiro (`gerar-kiro.mjs`) e o procedimento para rodá-lo; doutor lê o `runtime` do `harness.json`; `spec-tech-rules` materializa rules no Kiro; marcadores do `GUIA.html` recuperados depois do merge |
| 2.3.0 | 2026-09-21 | `v2.3.0` | o `GUIA.html` reescrito na voz de quem conversa — o humano põe insumo, pede e revisa; o agente lê e escreve —, o mapa da trilha em CSS puro com os modos Ler tudo e Mapa, e as asserções novas do `guia.test.mjs` que prendem a anatomia do passo e a fiação do mapa |
| 2.4.0 | 2026-09-22 | — | **descartada, nunca publicada** — gerada no Plano 9 (modo Fluxo do GUIA) antes de o GUIA sair do harness; o zip ficou em `harness-elo-v2-zips/` e o número não se reusa (Decisão 66) |
| 2.5.0 | 2026-10-06 | `v2.5.0` | o kit de 29/09 pelo merge de três pontas — a `spec-frame` (Fase 1, enquadramento) e a renumeração das fases; o `GUIA.html` sai do harness, o guia do usuário é distribuído à parte; o registro de quem mantém (`docs/`) e o baseline do ADO (`.azuredevops/`) fora do zip pela `EXCLUSOES` do `empacotar.mjs` |
| 2.6.0 | 2026-10-21 | `v2.6.0` | validação independente do código por task (G3 da `spec-implement`: `validar.mjs`, linha de base dos comandos, varredura determinística e os agentes de `.claude/agents/`); a versão Cursor (`gerar-cursor.mjs`); o manifesto da zona imutável (`harness-zona.lock.json`) e o `verificar-zona.mjs`, com o pipeline de PR; a trava abre no template (Decisão 67) e a do PowerShell lê o alvo de cada instrução; o contexto fixo enxuto; a `spec-status-report` 2.3 («O que falta testar», «Bugs por módulo»); o plano de melhoria das skills, Ondas 1–6 e Decisões 68–74 — correções de prosa e de caminho, `--dry-run` e confirmação na `spec-tasks-azure`, sete scripts de verificação (WARNING), `forecast.mjs`, SKILL.md −21% (Decisão 73: `security` e `frontend` não materializadas de novo), kernel de segurança com HLD e GAPs, regra única de rastreio SEC com criação da task pelo MCP, agregador da `spec-estimate-report`, ordem do backlog e marca de regra de negócio no Azure DevOps, WCAG 2.2 AA; a revisão de riscos de 2026-10-21 (exemplo sintético da `spec-estimate-report`, StackRank depois do backlog existente, leitura explícita da constituição de frontend); os pipelines de publicação no SharePoint (`.azuredevops/pipelines/`, fora do zip), que disparam na tag; o teste ponta a ponta de 2026-10-21 e as correções ALTA e MÉDIA dele (a `spec-frame` grava no Explore, o fecho confere a dispensa do modelo de dados e a fidelidade do protótipo, os gates da `spec-tasks` leem o contrato e o modelo do projeto, o `andamento.mjs` da `spec-implement`, a varredura sem falso positivo em `CHANGE_ME`, a ponte dos GAPs do Explore para o Plan) |

## Gerar a versão Kiro

A versão do harness que roda no **Kiro** (`harness-elo-v2-kiro/`, ao lado deste repositório) é
**gerada** deste, nunca editada (Decisão 46 da spec de 2026-09-11). Quem mantém o template roda,
na raiz, depois de qualquer mudança:

```bash
git commit ...                       # PRIMEIRO: a mudança deste repositório commitada
export PYTHON_REPORT="<python com o pacote markdown — o venv do fixture serve>"
node .claude/ferramentas/gerar-kiro.mjs --saida ../harness-elo-v2-kiro --verificar
cd ../harness-elo-v2-kiro && git add -A && git commit -m "gerado: <o que mudou>"
```

**Quem publica o zip é o pipeline** `.azuredevops/pipelines/publicar-kiro.yml`: na tag
`v<versao>` de uma versão nova (ver "Gerar e publicar o zip"), ele roda o gerador com `--verificar` numa
pasta temporária, apaga o `.git/` da saída e publica `harness-elo-v2-kiro-<versao>.zip`. O comando
acima é para manter o repositório irmão `harness-elo-v2-kiro/`, para desenvolver o gerador e para a
contingência manual daquela seção.

**Commit aqui antes de gerar.** O `geradoDe` é o `HEAD` deste repositório no momento da geração;
gerar com mudança não commitada faz ele apontar para um commit que não contém o gerador que
produziu a saída. `--verificar` roda a suíte **da saída** e falha se ela não estiver verde; sem
`PYTHON_REPORT` o `report-dominios.test.mjs` dá 11 vermelhos por desenho. O `harness.json` gerado
carrega `geradoDe` com o SHA deste repositório no momento da geração: uma saída cujo `git diff`
mostra mudança sem mudança de `geradoDe` foi editada à mão, e a próxima geração a sobrescreve —
**a saída nunca é editada**, e o `git add -A` é aceitável lá porque ninguém mais escreve nela.

**Três listas dentro do `gerar-kiro.mjs`, e quem cria caminho novo mexe nelas:**

| Lista | O que é | Quando mexer |
|---|---|---|
| `REESCRITAS` | tabela ordenada de caminhos Claude Code → Kiro, aplicada a todo texto | ao criar um caminho novo sob a pasta de maquinário da fonte que não caia nas linhas existentes |
| `REMENDOS` | literal exato → substituto, por arquivo, para split de tokens e afirmações do Claude Code em teste | quando a geração reporta `SOBRAS`, ou a suíte da saída cai num teste que afirma coisa do Claude Code |
| `EXCLUSOES` | o que não vai para a saída — inclui, além dos módulos só do Claude Code, qualquer segmento `__pycache__/` e `*.pyc` (o gerador anda o disco, não o índice do git) | módulo que só faz sentido no Claude Code (hoje: `wiring.test.mjs`, `.claude/settings.json`, `empacotar.mjs`, `empacotar.test.mjs`) |

**Desde a última linha de `REESCRITAS`** — a linha genérica final, que pega todo caminho do Claude
Code que sobrar, depois de qualquer outra linha mais específica ter tido a sua vez — **o alarme de
`SOBRAS` está fechado por construção**: não sobra caminho do Claude Code que ela deixe passar, e ele
continua na lista como rede de segurança legada, não como alarme que ainda dispara na prática. Os
dois alarmes que ainda disparam de verdade são **remendo órfão**, quando um literal de `REMENDOS`
não está mais na fonte — a fonte mudou e o remendo ficaria silenciosamente sem efeito —, e
**`--verificar`**, que roda a suíte da própria saída (`PYTHON_REPORT` incluído) e falha se ela não
estiver verde.

**Os geradores leem a árvore de trabalho, não o `HEAD`.** Arquivo modificado ou não rastreado entra
na saída; só o `geradoDe` vem do `git rev-parse HEAD`. Por isso o `geradoDe` só é fiel com a árvore
limpa — é mais uma razão para commitar antes.

**Rules no Kiro.** A de segurança vai para `.kiro/steering/` com `inclusion: always`. A de frontend
vai para `.kiro/steering/harness-frontend.md` com `inclusion: fileMatch` e um `fileMatchPattern` em
**lista**, com as chaves do `paths:` da fonte expandidas (`**/*.ts`, `**/*.tsx`, …): a documentação do
Kiro mostra glob simples ou lista e não garante expansão de chaves. Ela entra na zona imutável da
saída. As três de fase ficam em `.kiro/fases/`, fora do steering.

**Como o Kiro lê o steering** ([kiro.dev/docs/steering](https://kiro.dev/docs/steering/), consultado
em 2026-10-19). Ele corrige a crença antiga, repetida aqui e na `spec-tech-rules`, de que "a CLI ignora
`inclusion` e carrega todo o steering":

- A IDE e a CLI V3 honram os quatro modos: `always`, `fileMatch`, `manual` e `auto`.
- A CLI V1/V2 só carrega sozinha a `always`; `fileMatch`, `manual` e `auto` **não** carregam. Ali a
  de frontend precisa ser anexada (`#harness-frontend`), e o `harness-fase.md` gerado diz isso.
- O frontmatter tem que ser a primeira coisa do arquivo.
- `fileMatchPattern` aceita string ou lista; a documentação não cita chaves, daí a lista expandida.
- Agente customizado (`.kiro/agents/*.json`) **não** inclui o steering sozinho: precisa de
  `"resources": ["file://.kiro/steering/**/*.md"]`. É requisito do agente `harness-elo` da K2.
- O `AGENTS.md` da raiz é sempre incluído.

**O G3 no Kiro** roda com `validar.mjs iniciar --sem-agentes` (ver "Validação independente"): os
agentes ficam fora da saída, o `validar.mjs` vai.

**O que a saída NÃO tem, até a K2:** hooks ligados. Os `.mjs` de `.claude/hooks/` vão como biblioteca
testada; o agente `.kiro/agents/harness-elo.json` que os dispara é o Plano K2, e ele depende das
medições da K0 (`docs/execucao/verificacao/verificacoes-primeiro-dia-kiro.md` do repositório de
documentos).

## Gerar a versão Cursor

A versão do harness que roda no **Cursor** é **gerada** deste repositório, nunca editada, no
mesmo molde da versão Kiro. Quem publica é o pipeline `.azuredevops/pipelines/publicar-cursor.yml`:
na tag `v<versao>` de uma versão nova (ver "Gerar e publicar o zip") ele roda o gerador, apaga o
`.git/` da saída e publica `harness-elo-v2-cursor-<versao>.zip`. À mão — para desenvolver o gerador
ou na contingência manual daquela seção —, na raiz:

```bash
export PYTHON_REPORT="<python com o pacote markdown — o venv do fixture serve>"
node .claude/ferramentas/gerar-cursor.mjs --saida ../harness-elo-v2-cursor --verificar
```

O contrato da linha de comando é fixo, porque o pipeline depende dele: `--saida <dir>` obrigatório,
`--verificar` roda a suíte **da saída**, `--json` troca o relatório por JSON. O código de saída é 0
só se a geração passou e, com `--verificar`, só se a suíte da saída ficou verde. As duas regras do
Kiro valem aqui: commit antes de gerar (`geradoDe` é o `HEAD`), e a saída nunca é editada.

**O que vira o quê:**

| Na fonte | Na saída | Como |
|---|---|---|
| `CLAUDE.md` | `AGENTS.md` | o Cursor lê `AGENTS.md` na raiz; a frase do hook ganha o nome do evento |
| as cinco rules do harness | `.mdc` em `.cursor/rules/harness/` | `paths:` vira `globs:` sem aspas, com as chaves expandidas em lista (`**/*.ts,**/*.tsx,…`); `alwaysApply` explícito: `true` só na de segurança |
| — | `.cursor/rules/harness/harness-fase.mdc` | gerada, sempre aplicada: o que fazer se a fase não chegou |
| as skills | `.cursor/skills/` | copiadas; `name` igual à pasta e `description` validados antes de escrever |
| os agentes do `validar.mjs` | `.cursor/agents/` | `model` vira `inherit`; os campos que o Cursor não conhece ficam. O Cursor ignora `tools:`: quem garante que o validador não alterou nada é a guarda do `validar.mjs` |
| o wiring de hooks | `.cursor/hooks.json` | montado pela tabela `HOOKS`; hook novo na fonte derruba a geração até alguém decidir |

**Como a fase chega.** O Cursor tem o evento `sessionStart`, que devolve `additional_context`. O
adaptador `.cursor/hooks/cursor-sessionstart.mjs` roda o `estado.mjs` sem cópia e só troca a
forma da saída. As rules de fase não carregam sozinhas: `alwaysApply: false` e um `globs` que só
casa com o próprio arquivo. A `harness-fase.mdc` diz o que anexar quando o hook não rodou
(hooks desligados, agente em segundo plano, subagente).

**Travas: o que roda e o que fica como biblioteca.**

- **Roda.** O `beforeShellExecution` passa pelo adaptador `.cursor/hooks/cursor-shell.mjs`, que
  mostra o comando à tabela do `pretooluse.mjs` como tool `Bash`. Isso liga o `escrita-bash` e o
  `delivery-gate`.
- **Fica como biblioteca testada.** As travas de escrita de arquivo e de skill (`zona-imutavel`,
  `congelamento`, `cadeia`, `fecho-explore`) e os avisos do `posttooluse.mjs`. O Cursor não documenta
  o `tool_input` da tool `Write` nem tem tool de skill: ligar às cegas daria trava que não trava.

O `cursor-wiring.test.mjs`, gerado, toma o lugar do `wiring.test.mjs` na suíte da saída.

**As mesmas três listas do Kiro**, dentro do `gerar-cursor.mjs`: `REESCRITAS` (as rules do harness
mudam também de extensão, `.md` → `.mdc`), `REMENDOS` (caminho montado em tokens separados e
fixture de caixa) e `EXCLUSOES` (a do Kiro, mais os dois geradores e qualquer `.cursor/` da fonte).
Os alarmes são os do Kiro: remendo órfão, `SOBRAS` e `--verificar`.

**A raiz de `.cursor/rules/` é do projeto.** A `spec-tech-rules` escreve ali, no ambiente Cursor.
O maquinário fica em `.cursor/rules/harness/`, que é zona imutável na saída.

**A `spec-tech-rules` da saída vai detectar o Cursor sozinha** (`tools/ambiente.py`, pelo `runtime`
do `harness.json` gerado) e gravar em `.cursor/rules/` — **pendente**, ver o aviso em
"spec-tech-rules — detecção do ambiente"; hoje ela pergunta, e a resposta certa no Cursor é `cursor`. A tabela de reescrita ainda troca a pasta do
Claude Code pela do Cursor na PROSA das opções `claude` e `ambos` do SKILL.md, mas quem decide o
destino é o script, imune à reescrita — ver "spec-tech-rules — detecção do ambiente", acima.

## Contexto fixo — o que toda sessão carrega, e por que isso tem orçamento

Tudo que carrega sozinho entra em **toda** sessão e em **todo** subagente comum, e é reenviado a
cada volta do modelo. Medido em 2026-10-14, antes desta seção existir:

| Medida | Resultado |
|---|---|
| Subagente `general-purpose` que só respondeu 6 linhas | 114.650 tokens |
| Parte disso que é CLAUDE.md e rules | ~28 mil tokens por chamada |
| Rules de fase | as 3 carregavam juntas, embora só uma valesse |
| Rule de segurança | carregava 2 vezes (a do usuário e a do projeto) |

**A regra, desde então:**

- **Nenhuma rule nova sem `paths:`**, exceto a de segurança, que carrega sempre por desenho.
- O `paths:` do harness é **um glob entre aspas, com chaves**: `"**/*.{ts,tsx,js,jsx,html,css,mdx}"`.
  Medido em 2026-10-19, no Claude Code 2.1.295, com uma rule de teste por forma e a leitura de um
  arquivo que casava só com o **segundo** glob de cada uma: CSV sem aspas, CSV com aspas, chaves com
  aspas e lista YAML **carregaram as quatro**, e o controle (arquivo que não casa) não carregou. O
  aviso antigo desta seção ("sem aspas é alias YAML e quebra") e o da `spec-tech-rules` ("com aspas
  ou em lista não carrega") estavam ambos desatualizados para essa versão. A forma com chaves foi
  escolhida porque os dois geradores a convertem sem ambiguidade (`globs:` no Cursor,
  `fileMatchPattern` em lista no Kiro).
- **As rules de fase** (`explore.md`, `plan.md`, `deliver.md`) têm `paths:` que só casa com o próprio
  arquivo, e entram **pela injeção do `estado.mjs`**, que lê a da fase detectada (`RULE_DA_FASE`).
  Subagente não recebe o `additionalContext` do `SessionStart` (medido), então perdeu a rule de fase
  que antes via por acaso; quem lança subagente cita o arquivo no prompt (`CLAUDE.md`).
- **A injeção tem orçamento: `ORCAMENTO_CONTEXTO = 9000` caracteres** (`estado.mjs`). Acima de ~10 mil
  o Claude Code troca o `additionalContext` por uma prévia de 2 KB e grava o resto em arquivo — e a
  rule, que ia no fim, sumia inteira (medido: Explore 10.858, Plan 10.652). Agora o `estado` injeta a
  rule inline só quando estado + rule cabem no orçamento (hoje, só a do Deliver). No Explore e no
  Plan, o topo da mensagem manda ler o arquivo da rule (`.claude/rules/harness/<fase>.md`; no Cursor
  `.cursor/rules/harness/<fase>.mdc`, no Kiro `.kiro/fases/harness-<fase>.md`) antes de qualquer outra
  ação. Se nem o estado couber, as listas dele são enxugadas. O `estado.test.mjs` prende o orçamento
  e a posição da instrução nos 2.000 primeiros caracteres.
- **A rule de frontend** tem `paths:` com os tipos de arquivo de frontend.
- O `estado.test.mjs` cobra as quatro coisas:
  - as três de fase têm o `paths:` do próprio arquivo;
  - a de frontend tem `paths:`;
  - a de segurança não tem;
  - o texto da fase chega ao `additionalContext`.

**Agente de projeto em `.claude/agents/`** com `omitClaudeMd: true` e `tools` mínimo custa cerca de
5,7 mil tokens. A mesma definição sem `omitClaudeMd` custa cerca de 50 mil. O campo vale a partir do
Claude Code 2.1.295 (está na lista de campos de frontmatter do binário dessa versão; a 2.1.245 o
ignorava) e não aparece na documentação pública: se a economia sumir numa versão nova, é o primeiro
lugar a olhar. Qualquer agente que o
harness venha a ter nasce com as duas coisas.

**Em aberto:** as cópias do nível de usuário (`~/.claude/rules/security.md` e `frontend.md`) ainda
duplicam as do projeto. Elas não são deste repositório: o conserto é do `install-user` do Eng_Proc,
ou um `claudeMdExcludes` na configuração do projeto, se a medição mostrar que ele alcança rules.

## Validação independente — `validar.mjs` e os agentes de `.claude/agents/`

O ciclo validar → corrigir → revalidar de uma task mora em três lugares:

| Onde | O quê |
|---|---|
| `.claude/ferramentas/validar.mjs` | a máquina de estados (`linha-de-base`, `iniciar`, `avancar`); decide tudo, sem modelo |
| `.claude/ferramentas/validacao/` | os módulos puros e a `fixture/` de calibração, com defeitos plantados |
| `.claude/agents/` | os seis validadores e o corretor, chamados pela ferramenta Agent |

**Por que `.claude/agents/`.** É o único lugar de onde a ferramenta Agent carrega um tipo de agente. A
pasta entrou na zona imutável (`harness.json` e `kit.mjs`), então o hook `zonas` impede o corretor de
reescrever um validador. A pasta é lida **só quando a sessão começa**: agente novo ou editado só vale
numa sessão aberta depois da mudança.

**Por que fora da versão Kiro** (`EXCLUSOES` do `gerar-kiro.mjs`). Os agentes estão no markdown do
Claude Code; o Kiro tem agentes em `.kiro/agents/`, mas em JSON, e não há conversor. No Kiro o G3
roda com `--sem-agentes` (ver "Ambientes", abaixo). A linha `EXCLUSOES` da tabela de remendos acima não os cita de
propósito: aquela linha é marcador do gerador, e mudar o texto dela quebra a geração.

**Regras para mexer num agente:**

- `model: inherit` sempre. O harness roda em Claude Code, Cursor e Kiro, com modelos de qualquer
  fabricante; modelo fixo prenderia o G3 a um deles.
- `omitClaudeMd: true` sempre.
- `tools` mínimo. Validador: `Read, Write, Grep, Glob` (grava só o próprio resultado). Corretor:
  acrescenta `Edit` e `Bash`.
- `maxTurns` sempre, e descrição de uma linha, porque ela entra em toda sessão.

O `validacao.test.mjs` cobra as quatro coisas. Depois de mudar um agente, recalibre com a fixture
(`validacao/fixture/LEIA-ME.md`).

### Ambientes, guarda e evidência — 2026-10-19

Saiu da revisão de 2026-10-19 (95 testes no `validacao.test.mjs`, 35 novos):

- **Ambientes.** No Claude Code e no Cursor o G3 roda completo: varredura determinística, até seis
  validadores e o corretor. No Cursor o `tools:` dos agentes é ignorado, e quem garante que o
  validador não alterou nada é a guarda. No Kiro, ou em qualquer ferramenta sem subagente, rode
  `iniciar --sem-agentes`: comandos, varredura e mensagens decidem por código, nenhuma ação dispara
  agente, e o `corrigir` é feito pelo próprio agente da sessão, sob a mesma guarda. O relatório
  registra `"modo": "sem-agentes"`. `VALIDACAO_INDISPONIVEL` só vale quando não há `tasks.json` local.
- **Timeout e retomada.** `iniciar` e `avancar` rodam os comandos do projeto, o Semgrep e o gitleaks,
  e isso pode levar minutos. Rode com timeout alto (no Bash do Claude Code, `timeout: 600000`) ou em
  segundo plano. O `estado.json` é gravado antes de cada comando longo: se o processo cair, `avancar`
  retoma. `iniciar` sempre recomeça do zero e limpa `outputs/spec/validacao/<TASK>/`. Depois de `fim`
  ou `parar`, `avancar` só repete a ação final.
- **Guarda.** A cada rodada o script fotografa o que o git vê como alterado no repositório do código
  e todos os arquivos de `outputs/spec/` e `.claude/` do harness, mais o `tasks.json` da task, mesmo
  quando harness e código são repositórios diferentes. Ficam de fora a pasta de trabalho, o
  `settings.local.json` e `worktrees/`. Validador que altera qualquer arquivo, ou corretor que mexe na
  régua, para o ciclo. **Limite:** arquivo ignorado pelo git no repositório do código (`.env`,
  `dist/`) não entra na foto.
- **Evidência.** A conferência só lê dentro do repositório do código: recusa absoluto fora dele,
  `../`, `outputs/`, `.claude/` e a raiz do harness. A evidência de um modelo precisa de 12 ou mais
  caracteres não-brancos e de nome de verdade além de palavra-chave e pontuação. Evidência de segredo
  sai mascarada (prefixo de 4 caracteres + `****`) no estado, no relatório e na entrada do corretor; a
  conferência refaz a máscara no disco.
- **Nomes de arquivo.** Todo `git` roda com `-c core.quotePath=false`, e o leitor de diff tira as
  aspas de C: arquivo com acento ou espaço não some mais da validação.
- **Ferramentas externas.** Semgrep e gitleaks gravam saídas separadas (`semgrep.json`,
  `gitleaks.json`). O `gitleaks dir` roda numa cópia temporária só com os arquivos da entrega. No
  Windows, shims `.cmd`/`.bat` são achados e executados com shell.
- **Rules do projeto no Kiro.** Lá as rules do projeto e as do harness dividem `.kiro/steering/`;
  o `rules.mjs` ignora os arquivos `harness-*` ao montar os trechos de "rules do projeto". Sem isso, a
  rule de frontend do harness entrava para o validador de rules técnicas mesmo sem arquivo de tela
  (achado pela suíte da saída Kiro).
- **Regras de frontend.** `fetch-na-tela` e `formato-no-jsx` só valem com a rule de frontend Next.js
  em vigor: `--regras-frontend auto` (padrão) as liga quando a rule do harness existe e nenhuma rule
  de frontend do projeto fala de outra stack; `sim` e `nao` forçam.
- **Falsos positivos estreitados**, cada um com o caso legítimo preso em teste: `auth`/`sess` em
  palavra maior, palavra sensível dentro de texto literal de log, `innerHTML`/`eval`/chave em teste e
  `.md`, `obj.eval()`, placeholder de segredo, `NEXT_PUBLIC_*` que não sugere segredo, `catch` que
  repassa o erro, `reader.read()` em laço. A fixture continua achando os mesmos defeitos.
- **Ciclo.** Entre lotes da mesma dimensão, NAO_CUMPRE com evidência conferida vence CUMPRE. A chave
  de um achado é `arquivo:linha` + regra ou dimensão, não o título (evita oscilação falsa). Reenvio
  acrescenta o lote que falhou sem apagar os válidos. `--cmd-<x> ""` é "não informado" e aparece em
  `naoInformados`.

### Revisão do G3 — 2026-10-21 (revisão de riscos, item 13)

A revisão de riscos do pacote achou o G3 travando entrega legítima, deixando o corretor sem limite e
falhando no Windows. 129 testes no `validacao.test.mjs` + `varrer-entrega.test.mjs` (28 novos, «13.x»).

- **Linha de base.** Subcomando `validar.mjs linha-de-base --task <TASK>`, rodado antes do código (E1
  da `spec-implement`): grava em `outputs/spec/validacao/<TASK>.linha-de-base.json` como os comandos
  do projeto saem, com o HEAD e os arquivos já alterados. `iniciar --linha-de-base <arquivo>` a usa:
  falha com o mesmo comando e com toda linha de falha (normalizada — sem cor, número, tempo, hash e
  caminho do repositório) já presente na base vai para `preExistentes` e não bloqueia; linha nova
  bloqueia e chega ao corretor só com as linhas novas. Base de outro repositório, de commit que não é
  ancestral do HEAD ou de outro comando é descartada, com o motivo. **Limite:** a linha de base não
  prova o momento em que foi tirada; o relatório lista os arquivos da entrega já alterados nela.
  Antes, teste vermelho antigo ou lint do repositório inteiro travava toda task até PARADO.
- **Grupo sem arquivo** (comando que falhou, NAO_CUMPRE sem evidência): o escopo é a entrega. Antes,
  escopo vazio desligava a guarda e o corretor podia mexer em qualquer arquivo do código.
- **Shell.** No Windows os comandos do projeto rodam no Git Bash (achado por `EXEPATH`, `git
  --exec-path`, instalação padrão e PATH; nunca o `bash.exe` do WSL); `--shell auto|bash|cmd|powershell`
  força; o relatório registra o shell. Antes rodavam no `cmd.exe`, e `./mvnw test` falhava sempre.
- **`parar` tem saída.** A ação traz `editadosPeloCorretor` e a instrução: comentar os bloqueantes no
  work item com o estado inalterado (o caminho do G2), devolutiva do J em modo falha, mostrar o diff
  das edições do corretor e perguntar se mantém ou descarta, e não começar a próxima task do lote em
  cima da parada.
- **Registro do corretor lido.** O `corrigido-N.json` vai para `naoCorrigidos` no relatório; rodada
  que não mudou arquivo e recusou tudo para o ciclo na hora, em vez de gastar revalidação.
- **Varredura** (`validacao/varredura.mjs`, lista no cabeçalho). Falsos positivos estreitados: HTML
  sanitizado na linha anterior, `innerHTML = ''`, JSON-LD, `catch` de uma linha que trata ou explica,
  SQL Java parametrizado em várias linhas e constante em caixa alta, identificador maior que contém
  palavra sensível (`emailVerificado`, `cpfValido`), chave de storage que não é token, nome de header
  e rótulo de i18n, laço de paginação e de retry, `fetch-na-tela` e `formato-no-jsx` só em `.tsx/.jsx`.
  Falsos negativos cobertos: regras `segredo-em-configuracao` e `segredo-connection-string`, SQL por
  f-string e por concatenação em Java, dado pessoal em log de Python e C#, `except: pass`.
  `roteador.mjs`: `.tf`, `.sh`, `.ps1`, `.properties` e `appsettings*` são `config`; lock files são a
  classe `lock`, que nenhum validador de modelo lê. A fixture continua achando os mesmos defeitos.
- **Cota e dependências.** `NOVOS_POR_GRUPO` 3 → 5 (a correção que a própria varredura pede — service,
  paths, hook, query-keys, mapper — são cinco arquivos); manifesto e lock de dependência nunca entram
  no escopo: dependência nova é decisão humana, e o item volta como «não corrigido: exige dependência».
- **Build.** `--cmd-build` roda a cada rodada, como os outros comandos.
- **MÉDIO e BAIXO.** O relatório troca o contador `ignorados` por `medioEBaixo`, que diz que eles não
  são avaliados no G3. **Ressalva:** a `auditoria-de-us` acha MÉDIO e o registra como débito no
  `gaps-document.md`, mas não propõe a task `SEC-NNN` que a `security.md` pede para MÉDIO — ver «O
  que ficou pendente no pacote 2.6.0».
- **Subpasta.** `git diff --relative`, e `git status`/`ls-files` com os caminhos trazidos para a pasta
  do `--repo`: apontar para uma subpasta de um repositório deixou de anular a varredura em silêncio.

### Fase 1 de custo — 2026-10-16

O que a recalibração mostrou (~834 mil tokens por ciclo, parado no limite) levou a cinco mudanças:

| Mudança | Onde | Por quê |
|---|---|---|
| **Só CRÍTICO e ALTO.** MÉDIO e BAIXO são ignorados: nem bloqueiam nem viram lista; o relatório só conta quantos vieram (`ignorados`) | `consolidar.mjs`, entrada e agentes | atenção e saída gastas com o que não bloqueia, e aviso médio virando bloqueante por outro caminho |
| **Varredura determinística antes do modelo**: segredo, dado pessoal em log, HTML cru, token no storage, `eval`, SQL e shell montados, erro engolido, consulta em laço, `fetch` e formatação na tela. Semgrep e gitleaks entram quando estão no PATH (`--sem-externas` desliga) | `validacao/varredura.mjs` | regra fixa não custa token e não varia entre execuções. Na fixture, ela acha sozinha os seis defeitos que não são de regra de negócio |
| **Validador de um turno** (`maxTurns: 4`): responde com o que está na entrada, sem reabrir arquivo para "confirmar" a linha | agentes e `entrada.mjs` | cada volta reenviava o contexto inteiro |
| **Revalidação incremental**: da rodada 2 em diante, só os arquivos que a correção tocou e os que têm item aberto, com as linhas mudadas marcadas `*`; a pergunta que já era CUMPRE em arquivo intocado fica resolvida, e a dimensão sem nada a rever não é chamada | `validar.mjs` (`guardarAntes`, `linhasDaCorrecao`), `diff.mjs` (`linhasMudadas`) | as rodadas seguintes revalidavam a entrega inteira |
| **Corretor com escopo travado**: só os arquivos do grupo, testes e até cinco arquivos novos (eram três até a revisão de 2026-10-21, item 13.7); fora disso a rodada é recusada, e refatoração vira "não corrigido" | `guarda.mjs` (`NOVOS_POR_GRUPO`), entrada e agente | o corretor refez o componente em uns dez arquivos |

As regras da varredura são estreitas de propósito: toda regra bloqueia, e falso positivo é rodada de
correção gasta à toa. Na dúvida, a regra não dispara e o validador de modelo decide. O
`validacao.test.mjs` prende o que cada regra pega e o caso legítimo que ela não pode pegar.

**Recalibração da Fase 1 (2026-10-16), mesma fixture, uma execução.** Todos os agentes com o modelo
da sessão (`inherit`), Semgrep e gitleaks ausentes:

| | Recalibração anterior | Fase 1 |
|---|---|---|
| Achados do `esperado.json` na rodada 1 | todos | todos (13): 8 pela varredura e pelas mensagens, 5 pelos modelos |
| Evidência inventada | zero | zero |
| Bloqueantes por rodada | 28 → 1 → 1 (+1 incerto) | 21 → 1 → 0 |
| Veredito | PARADO no limite | **APROVADO** na rodada 3 |
| Tokens dos validadores | ~545 mil | ~252 mil |
| Tokens do corretor | ~289 mil | ~138 mil |
| **Tokens do ciclo** | **~834 mil** | **~390 mil** |

O que a calibração mostrou e já está corrigido:

- A cópia "antes" da correção era gravada com os nomes originais dentro da pasta de trabalho, e o
  `node --test` achou e executou `antes/test/*.test.js`. Agora são nomes neutros com um índice
  (`guardarAntes`).
- Na rodada 3, `regras-negocio` foi chamada sem pergunta reaberta nem item aberto (~13 mil tokens
  para responder "nada"). Agora ela não é chamada nesse caso (`SO_PERGUNTAS`).
- O validador de segurança bateu no limite de 4 voltas uma vez, depois de gravar o resultado. Se
  isso se repetir sem resultado, o reenvio do `avancar` cobre; se virar padrão, suba para 5.

Em aberto: a variação entre execuções continua sem medida (exige repetir o ciclo).

### Calibração de 2026-10-16 — o que mediu e o que mudou

Ciclo completo na fixture, com os agentes reais:

| Medida | Resultado |
|---|---|
| Defeitos plantados achados na rodada 1 | todos (13 itens do `esperado.json`) |
| Evidência inventada (descartada pela conferência no disco) | zero, nas 3 rodadas |
| Bloqueantes por rodada | 17 → 4 → 3; parou no limite de 3 rodadas, como previsto |
| Tokens do ciclo | ~834 mil: ~589 mil nos validadores, ~245 mil no corretor |
| Variação entre execuções | **não medida** — exige repetir o ciclo |

Os quatro ajustes que saíram dela:

1. **Trechos de rule na entrada** (`validacao/rules.mjs`): segurança recebe os vetores e as camadas
   A, B, C, E, F e G; rules técnicas recebe a rule de frontend (com arquivo de tela) e as seções
   proibitivas das rules do projeto. Antes, o validador de rules técnicas estourava 8 voltas em toda
   rodada, e retomá-lo custou ~123 mil tokens. `maxTurns` desses dois subiu para 12.
2. **Pasta do código na entrada.** Sem ela, um validador procurou `src/...` a partir da raiz do
   harness e leu o código-fonte da fixture, ao lado do gabarito dela.
3. **Fusão de achados só na mesma linha, de dimensões diferentes.** A regra de "até 2 linhas"
   engoliu o CPF no log e custou uma rodada.
4. **O corretor recebe as rules do que vai escrever** e refaz a regra para todos os casos quando
   reescreve um trecho: na rodada 2, três de quatro bloqueantes estavam em código que ele mesmo criou.

### Recalibração de 2026-10-16, com os ajustes acima

Mesma fixture, mesmo ciclo, agentes com a Etapa 6:

| | 1ª calibração | Recalibração |
|---|---|---|
| Validador que estourou o limite de voltas | 4 vezes, 3 retomadas (~123 mil tokens) | nenhuma vez |
| Evidência inventada | zero | zero |
| CPF no log | escondido pela fusão | achado próprio na rodada 1 |
| Bloqueantes por rodada | 17 → 4 → 3 | 28 → 1 → 1 (+1 incerto) |
| Veredito | PARADO no limite | PARADO no limite |
| Tokens do ciclo | ~834 mil (589 mil validadores, 245 mil corretor) | ~834 mil (545 mil validadores, 289 mil corretor) |

**O que os números dizem.** Os estouros de voltas acabaram e o ciclo convergiu bem mais rápido, mas
o total de tokens não caiu. Com as rules na entrada, os validadores ficaram mais rigorosos (28
bloqueantes na rodada 1). O corretor então refez o componente na arquitetura da rule de frontend,
criando uns dez arquivos, e as rodadas seguintes validaram mais código. Parte disso é da fixture: um
mini projeto JS sem a estrutura do Next, que a rule obriga a reconstruir.

Os dois ajustes que saíram da recalibração:

5. **Verificação de dimensão sem perguntas vira aviso** (`dimensoesComPerguntas` no
   `consolidar.mjs`). Segurança, performance, observabilidade e rules técnicas não respondem pergunta
   da task: a saída delas são os achados, que carregam severidade. Tratada como bloqueante, a
   verificação dessas dimensões causou dois problemas:
   - duplicou 4 achados na rodada 1;
   - fez um "fetch sem tempo limite", que era aviso MÉDIO na rodada 2, travar o ciclo na rodada 3.

   O incerto que sobrou (acesso ao pedido de outro cliente, que depende de uma rota fora da entrega)
   também vinha daí. Com o ajuste, a rodada 3 desta recalibração teria dado APROVADO. Verificação
   repetida de um achado da mesma dimensão, no mesmo `arquivo:linha`, é descartada. O formato de
   entrada dessas dimensões pede `verificacoes` vazia.
6. **`--cmd-testes` é o comando completo do projeto.** Na calibração foi passado um arquivo só, e os
   testes novos que o corretor criou ficaram fora da checagem por código. O G3 e o `LEIA-ME` da
   fixture agora dizem isso.
