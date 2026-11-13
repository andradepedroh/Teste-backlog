# Bootstrap de ferramentas externas (verificar → degradar; instalar só com aprovação)

> Fonte única de verdade da política de ferramentas externas do kit. Referenciado
> pelas skills que definem modo degradado `TOOL_UNAVAILABLE:<nome>`.

## Princípio

**O agente não muta o ambiente do usuário por conta própria.** Instalar pacote, baixar
binário, escrever no PATH ou no gerenciador de pacotes é ação que **altera a máquina de
quem está do outro lado** — exige confirmação humana explícita, conforme a Camada J do
`security.mdc` («confirmação humana antes de ações que mutam ambiente»).

Consequência prática: o default é **verificar → degradar**, nunca «verificar → tentar
instalar → degradar». Não existe `curl … | bash`, `go install`, `npm i -g` nem
`pip install` como instrução default deste kit.

## Política (default)

Antes de **qualquer passo** que use ferramenta externa:

1. **Verificar disponibilidade** — rodar `<tool> --version` (ou o comando de verificação
   da tabela). Disponível → seguir normalmente.
2. **Ausente → tentar a ROTA EFÊMERA da tabela**, se houver (`npx`, `uvx`, `pipx run`,
   container). Essas rotas executam a ferramenta sem instalá-la no ambiente: rodam em
   cache temporário do próprio gerenciador, não alteram PATH, não deixam pacote global.
   **Não contam como instalação** e não exigem aprovação nem `TOOL_INSTALLED`.
   - Rota efêmera funcionou → seguir normalmente.
   - Não há rota efêmera, ou ela falhou (sem rede, sem `npx`/`uv`) → passo 3.
3. **Degradar** — registrar `TOOL_UNAVAILABLE:<nome> (motivo curto)` no `sync-log.md` e
   seguir no **modo degradado documentado da skill**. Este é o caminho normal, não uma
   exceção: o kit é projetado para produzir resultado útil sem nenhuma dessas ferramentas.
4. **Opcionalmente, oferecer a instalação ao usuário** — no fim do passo, informar o que
   ficou degradado e **perguntar** se quer instalar, mostrando o comando exato da coluna
   «Instalação (só com aprovação)». Nunca executar antes da resposta.

## Instalação: quando é permitida

Só nestes dois casos:

- **(a) Aprovação explícita do usuário, registrada.** O usuário precisa ver o comando
  exato (incluindo escopo: global vs. projeto) e autorizar. Registrar no `sync-log.md`:
  `TOOL_INSTALLED:<nome> (aprovado por <quem>, <comando>)`. Aprovação é **por ferramenta
  e por comando** — não é um cheque em branco para o resto da sessão.
- **(b) Rota efêmera** (`npx`, `uvx`, `pipx run`, container). Não muta o ambiente, logo
  não precisa de aprovação. É a rota preferida sempre que existir.

**Proibido em qualquer caso** (mesmo com aprovação genérica «pode instalar»):

- `curl … | bash` / `iwr … | iex` — executar script remoto não auditado.
- `sudo`, elevação de privilégio, alteração de PATH global, registry, políticas do SO.
- `pip install --break-system-packages` — quebra o ambiente gerenciado do SO (PEP 668).
  Se o pip reclamar, a resposta é `uvx`/`pipx run` ou um venv do projeto, **não** a flag.
- Instalação silenciosa dentro de um passo automatizado, sem a pergunta do item 4.

**Invariantes:**

- **NUNCA** abortar a fase por ferramenta ausente — ausência rebaixa para o degradado.
- **NUNCA** instalar para «adiantar» um passo futuro.
- Ambiente **offline/air-gapped** → ir direto ao degradado, registrando
  `TOOL_UNAVAILABLE:<nome> (offline)`.

## Tabela ferramenta → verificação, rota efêmera e instalação

`Rota efêmera` = executa sem mutar o ambiente, **pode ser usada sem perguntar**.
`Instalação (só com aprovação)` = comando a **mostrar** ao usuário; executar apenas
depois do «sim» dele, registrado no sync-log.

| Ferramenta | Verificação | Rota efêmera (sem aprovação) | Instalação (só com aprovação) |
|---|---|---|---|
| vacuum | `vacuum version` | ✅ `npx --yes @quobix/vacuum …` | `npm i -g @quobix/vacuum` · binário do release (https://quobix.com/vacuum/installing/) |
| oasdiff | `oasdiff --version` | ✅ container — `docker run --rm -v "$PWD:/w" tufin/oasdiff …` | binário do release (https://github.com/oasdiff/oasdiff) · `go install github.com/oasdiff/oasdiff@latest` |
| @stoplight/prism-cli | `npx prism --version` | ✅ `npx --yes @stoplight/prism-cli mock …` | `npm i -D @stoplight/prism-cli` (no projeto) |
| d2 | `d2 --version` | ❌ — sem rota efêmera; degradar para D2 fonte sem SVG | `brew install d2` · `winget install Terrastruct.D2` · binário do release (https://github.com/terrastruct/d2/releases) — **não** usar o install.sh via pipe |
| scc | `scc --version` | ❌ — degradar (contagem via `git ls-files` + wc) | binário do release (https://github.com/boyter/scc/releases) · `brew install scc` |
| lizard | `lizard --version` | ✅ `uvx lizard …` · `pipx run lizard …` | `pip install lizard` (em venv do projeto) |
| ast-grep | `ast-grep --version` (ou `sg --version`) | ✅ `npx --yes -p @ast-grep/cli ast-grep scan …` | `npm i -g @ast-grep/cli` · `pip install ast-grep-cli` |
| knip | `npx knip --version` | ✅ `npx --yes knip …` | `npm i -D knip` (no projeto) |
| vulture | `vulture --version` | ✅ `uvx vulture …` · `pipx run vulture …` | `pip install vulture` (em venv) |
| deptry | `deptry --version` | ✅ `uvx deptry …` · `pipx run deptry …` | `pip install deptry` (em venv) |
| tbls | `tbls version` | ✅ container — `docker run --rm ghcr.io/k1low/tbls …` | binário do release (https://github.com/k1LoW/tbls/releases) · `brew install k1LoW/tap/tbls` |
| dependency-cruiser | `npx depcruise --version` | ✅ `npx --yes dependency-cruiser …` | `npm i -D dependency-cruiser` (no projeto) |
| repomix | `npx repomix --version` | ✅ `npx --yes repomix …` | `npm i -D repomix` (no projeto) |
| opengrep | `opengrep --version` | ✅ container — `docker run --rm -v "$PWD:/src" ghcr.io/opengrep/opengrep …` | binário do release (https://github.com/opengrep/opengrep/releases) — **nunca** o install.sh via pipe |
| semgrep CE *(alternativa ao opengrep)* | `semgrep --version` | ✅ `uvx semgrep …` · `pipx run semgrep …` | `pip install semgrep` (em venv) |
| gitleaks | `gitleaks version` | ✅ container — `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect -s /repo` | binário do release (https://github.com/gitleaks/gitleaks/releases) · `brew install gitleaks` · `winget install Gitleaks.Gitleaks` |
| osv-scanner | `osv-scanner --version` | ✅ container — `docker run --rm -v "$PWD:/src" ghcr.io/google/osv-scanner …` | binário do release (https://github.com/google/osv-scanner/releases) |
| pytm | `python3 -c "import pytm"` | ✅ `uvx --from pytm …` (quando o entrypoint permitir) | `pip install pytm` (em venv) |
| stryker | `npx stryker --version` | ✅ `npx --yes @stryker-mutator/core run` | `npm i -D @stryker-mutator/core` (no projeto) |
| mutmut | `mutmut --version` | ✅ `uvx mutmut …` · `pipx run mutmut …` | `pip install mutmut` (em venv) |
| schemathesis | `schemathesis --version` | ✅ `uvx schemathesis …` · `pipx run schemathesis …` | `pip install schemathesis` (em venv) |
| vale | `vale --version` | ✅ container — `docker run --rm -v "$PWD:/docs" jdkato/vale …` | binário do release (https://github.com/errata-ai/vale/releases) · `brew install vale` · `winget install errata-ai.Vale` |
| flowpulse | `flowpulse --version` | ✅ `uvx flowpulse …` · `pipx run flowpulse …` | `pip install flowpulse` (em venv) |
| playwright | `npx playwright --version` | ⚠️ `npx --yes playwright …` roda o CLI sem instalar, **mas** `playwright install` baixa browsers (~centenas de MB no cache do usuário) → tratar o download como mutação: **perguntar antes** | `npm i -D @playwright/test` + `npx playwright install` (no projeto, com aprovação) |
| markdown-py | `python3 -c "import markdown"` | ❌ — dependência do `generate-report.py`, precisa estar importável | `pip install markdown` (em venv) |

**Sem rota efêmera** (degradar por default, instalar só com «sim» explícito): d2, scc,
markdown-py — e playwright quando exigir download de browsers.

> **Nota sobre `pip`:** nunca `--break-system-packages`. Ordem de preferência:
> `uvx`/`pipx run` (efêmero) → venv do projeto (`python3 -m venv .venv`) → `pip install --user`
> **com aprovação**. Ambiente gerenciado pelo SO (PEP 668) não é lugar para instalação de
> conveniência do agente.

## Registro no sync-log (formato)

| Situação | Linha no `sync-log.md` |
|---|---|
| Já disponível | *(nada — uso normal)* |
| Rota efêmera usada | `TOOL_EPHEMERAL:<nome> (npx/uvx/container)` |
| Degradado | `TOOL_UNAVAILABLE:<nome> (motivo curto)` |
| Instalado com aprovação | `TOOL_INSTALLED:<nome> (aprovado por <quem>, <comando>)` |
| Instalação oferecida e recusada | `TOOL_UNAVAILABLE:<nome> (instalação recusada pelo usuário)` |
