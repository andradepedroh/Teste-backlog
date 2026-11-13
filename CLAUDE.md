# Harness Elo v2 — regras base

Protocolo de trabalho deste repositório. Vale para toda sessão, em qualquer fase.

## Protocolo de fases

Três fases, cada uma com um soberano diferente. O `estado` detecta a fase no início da sessão e
injeta a rule correspondente — você não precisa perguntar em que fase estamos. A rule de fase chega
**só** por essa injeção, e subagente não a recebe: quem lança um subagente que precise dela cita o
arquivo no prompt.

| Fase | Soberano | Loop humano | Entrega |
|---|---|---|---|
| 🔍 Explore | rules + verificadores | *in the loop* | quatro documentos, `gaps.md`, manifesto, protótipo alta fidelidade |
| 📐 Plan | Elo-Spec-Kit | *in the loop* | backlog no ADO, estimativa, kernel de segurança, Kit HTML |
| 🚀 Deliver | Elo-Spec-Kit | *on the loop* | código auditado por US, gate no push, PR |

Avançar de fase é decisão do usuário. Os verificadores impedem avançar **incompleto**; eles não
decidem quando avançar.

## Fonte de verdade única

Cada informação tem **um** dono. Quem não é dono referencia por ID; nunca duplica.

| Informação | Dono |
|---|---|
| Papel de cada repositório | `workspace.md` |
| Módulos e funcionalidades preliminares | `outputs/explore/hld-funcional.md` |
| Funcionalidades e regras de negócio preliminares | `outputs/explore/especificacao-funcional.md` |
| Questões abertas do pré-projeto | `outputs/explore/gaps.md` |
| Memória cronológica das três fases | `outputs/spec/sync-log.md` |
| Tudo a partir do Plan | os artefatos do `Elo-Spec-Kit` em `outputs/spec/` |

Contradição entre dois documentos é defeito, não ambiguidade. Corrija no dono e referencie nos
demais.

### A raiz do Plan é uma

**A raiz dos artefatos do Plan é UMA: `outputs/spec/`.** Toda skill do kit lê e escreve ali. Não é
escolha deste harness — é a doutrina escrita do kit, em `tools/references/paths.md`, e o kit tem CI
própria contra a volta do caminho antigo: o `tools/check-residues.py` dele falha se
`task-generator/` reaparecer dentro das skills.

Houve uma segunda, `task-generator/outputs/`, e ela saiu quando o kit foi vendorizado em
`.claude/skills/` (Decisão 7 da spec; `harness.json`, campo `kitVersao`). A razão de ter existido:
o kit descontinuou aquele layout, mas um plugin `spec-*` instalado **antes** da descontinuação
continuava escrevendo nele — e numa trava bloqueante procurar numa raiz só transformaria isso em
falso positivo permanente. Com o kit vendorizado não há mais plugin de versão desconhecida na
jogada, e manter o fallback seria manter caminho morto dentro de um bloqueante.

**Se você encontrar um `task-generator/outputs/` num projeto**, alguma skill do layout antigo
escreveu ali antes da migração. O lugar certo é `outputs/spec/`, e mover é seguro.

## Vocabulário de IDs

**Em `outputs/explore/`** — exatamente quatro famílias, nada mais:

`MOD-CODIGO` (módulo) · `RF-nnn` (funcionalidade) · `RN-nnn` (regra de negócio) · `GAP-nnn` (questão aberta)

Numeração com **três dígitos** (`RF-007`, `GAP-042`) — um documento de pré-projeto passa de 99, e
o padding é o que faz relatório ordenar certo. O código de módulo é livre em maiúsculas, dígitos e
hífen: `MOD-PAGAMENTOS` e `MOD-ACOMP-CARGA` são válidos.

`F-xxx` é **proibido** em `outputs/explore/`. No `Elo-Spec-Kit`, `F-xxx` significa fato atômico
com âncora de evidência, e a `spec-ingest` vai gerar `F-xxx` **a partir** destes documentos. Dois
`F` no mesmo arquivo destroem o rastreio exatamente onde ele importa.

**Nos artefatos do kit** — `outputs/spec/`, que é a raiz única — o vocabulário do kit vence sem
exceção: `F-xxx` · `RF-MOD-CODIGO-NNN` ·
`RN` / `RN-NOVO` · `GAP` · `SEC` · `MOD` · `FLX` / `ETP` / `TEL` / `TRS` · `PD` · `QA` · `CHG` · `DS`.

## Autoridade técnica

- **Segurança:** `.claude/rules/harness/security.md` — 10 camadas OWASP + LGPD. Nunca modificada.
- **Frontend:** `.claude/rules/harness/frontend.md` — a constituição padrão de empresa. É a dona
  dos seis estados de UI, do TTFV e do nível WCAG. Nenhum outro documento os redefine.
- **Rules geradas pelo projeto:** raiz de `.claude/rules/`, escritas pela `spec-tech-rules` no Plan.

## Zonas do projeto

| Zona | Caminho | Regra |
|---|---|---|
| **Imutável** | `CLAUDE.md`, `harness-zona.lock.json`, `.claude/hooks/`, `.claude/ferramentas/`, `.claude/settings.json`, `.claude/templates/`, `.claude/rules/harness/`, `.claude/agents/`, `.claude/skills/` | **nunca edite.** Atualização do template sobrescreve |
| **Mutável** | `inputs/`, `outputs/`, `task-generator/`, raiz de `.claude/rules/`, `.cursor/rules/` | é onde o projeto vive |

`task-generator/` não vem no pacote e **não deveria nascer**: é o layout descontinuado, e só aparece
se uma skill anterior à descontinuação rodar aqui. Está na tabela para o caso de aparecer — ela é
mutável, e mover o conteúdo dela para `outputs/spec/` é seguro.

Editar a zona imutável quebra a atualização por sobrescrita e transforma cada projeto num fork.
Se algo do maquinário precisa mudar, muda no template.

## Definição de pronto — três níveis, três autoridades

| Nível | Pergunta | Autoridade |
|---|---|---|
| Ready da US | posso começar? | ficha do work item em `tasks.json` |
| Pronto da US | posso abrir PR? | `auditoria-de-us` + `delivery-gate`; a aprovação do PR é do revisor humano |
| Pronto da fase | posso avançar? | `fecho-explore` na fronteira Explore→Plan; marco declarado na rule para Plan→Deliver |

## Guardrails

- **Evidência antes de afirmar.** Não diga que passou sem ter rodado. Cole a saída do comando.
  Se um passo foi pulado, diga que foi pulado.
- **Português do Brasil** em todo conteúdo humano: documentos, mensagens de erro, comentários.
- **Disciplina de git.** Um branch é uma user story no Deliver. No Explore, push direto na `main`
  é aceitável. Nunca use `--no-verify` nem `--force` sem pedido explícito.
- **LGPD.** Dado pessoal real nunca entra em `inputs/`, `outputs/` nem em prompt. Use dado
  sintético. Se um insumo recebido contém dado real, anonimize antes de versionar.
- **A spec é contrato.** Se a implementação diverge da spec, ou a spec muda com changelog, ou a
  implementação se corrige. Divergência silenciosa não existe.
- **O gate local não substitui a política de branch.** O `delivery-gate` intercepta o push emitido
  pelo agente. Push do terminal ou da IDE não passa por ele. A garantia autoritativa é o PR e a
  política de branch do Azure DevOps.
