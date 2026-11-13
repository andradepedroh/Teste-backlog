# Requisitos de Produto / UX — [Nome do Projeto]

Status: draft
Última atualização: YYYY-MM-DD
Fonte: legacy.md, product-vision.md, requirements/requirements.md, prototype.md (se existir)

**Âmbito deste arquivo:** PR (experiência, estados de UI, acessibilidade, jornadas).

**Rastreio obrigatório:** cada PR deve ligar a **pelo menos um RF** em [`../requirements/requirements.md`](../requirements/requirements.md). Um mesmo RF pode ter **vários** PR (cardinalidade RF 1:N PR). Os PR devem **espelhar o mesmo índice modular** de `requirements.md` (agrupar por `MOD-XXX`).

<!-- id: pr-module-index -->

## Índice de módulos (PR)

*(Mesmos códigos `MOD-*` que em `requirements.md`; só linhas com PR neste documento.)*

| Módulo | Objetivo negócio (resumo) | Qtd PR |
|--------|---------------------------|--------|
| MOD-EXEMPLO-A | | |
| MOD-EXEMPLO-B | | |
| … | | |

---

<!-- id: pr-overview -->

## Princípios de experiência

*(3-5 bullets específicos ao produto, derivados de dores no legacy.)*

```
### Princípio: [Nome curto]
**Origem:** [Dor / F-xxx que gerou]
**Descrição:** [O que significa na prática]
**Como verificar:** [Teste ou critério]
```

---

<!-- id: pr-traceability -->

## Rastreabilidade global (PR)

| ID PR | Módulo | RF relacionado *(≥1)* | Legacy / vision | F-xxx |
|-------|--------|----------------------|-----------------|-------|
| | MOD-XXX | RF-MOD-XXX-NN | | |

---

<!-- id: pr-section -->

## Requisitos de produto / UX por módulo

*(Repetir `## Módulo:` para cada módulo com PR.)*

## Módulo: [Nome em linguagem do cliente] (`MOD-XXX`)

### PR-MOD-XXX-001 — [título]

**RF relacionado:** RF-MOD-XXX-NN *(obrigatório; listar vários se necessário: RF-…, RF-…)*
**Etapa do fluxo:** ETP-xxx *(obrigatório quando o PR documenta uma tela: etapa(s) do `../flow-map.md` em que a tela aparece, separadas por vírgula; `—` se o PR não é de tela)*
<!-- Os ETP-xxx só nascem no Passo 4.7, que deriva `## Telas` DESTES PRs. Enquanto o 4.7 não fechar,
     escrever literalmente `— (pendente Passo 4.7)` — nunca inventar um ETP-xxx. -->

**Personas:**
**Prioridade:** Must / Should / Could
**Origem:** `Protótipo` (validar na implementação) / `Discovery` (validar com cliente) / `Normativo`

**Contexto de uso:**

**Requisito de experiência:**

**Critérios mensuráveis:**
- [Critério 1 — ex.: "Feedback visual em < 300ms"]

**Antipadrão (o que evitar):**
-

**Mapa de estados:**
- Carregando:
- Sucesso:
- Erro de validação:
- Erro de sistema:
- Vazio:
- Offline:

**Inventário de campos** *(OBRIGATÓRIO quando o PR documenta uma tela; `—` quando o PR não é de tela)*

*(Uma linha por campo de formulário, filtro ou coluna. Esta tabela é a fonte que a `spec-tasks` transcreve para `uiContext.fields[]`. **Os valores de cada lista de opções vão aqui, por extenso** — remeter a outro documento faz o detalhe nunca chegar a quem implementa.)*

| Campo | Rótulo | Tipo | Obrig. | Seleção | Opções (valor — rótulo) | Origem das opções | Máscara/Formato | Default | Limites | Validação → mensagem | RF/PR |
|-------|--------|------|--------|---------|--------------------------|-------------------|-----------------|---------|---------|----------------------|-------|
| exemploStatus | Situação | select | Não | única | `ATIVO` — Ativo; `SUSPENSO` — Suspenso; `BAIXADO` — Baixado | `enum:SituacaoCadastral` | — | — | — | — | RF-MOD-XXX-NN |
| exemploBusca | Contabilista | autocomplete | Não | única | *(dinâmica)* | `endpoint:GET /contabilistas` | — | — | mín. 3 caracteres | < 3 chars → "Digite ao menos 3 caracteres" | RF-MOD-XXX-NN |
| exemploPeriodo | Período | month | Não | múltipla | *(meses disponíveis)* | `endpoint:GET /periodos` | `MM/AAAA` | mês atual | — | — | RF-MOD-XXX-NN |

**Tipos aceitos:** `text`, `textarea`, `number`, `currency`, `percent`, `date`, `datetime`, `daterange`, `month`, `time`, `email`, `phone`, `cpf`, `cnpj`, `document`, `password`, `file`, `select`, `multiselect`, `radio`, `checkbox`, `checkboxgroup`, `toggle`, `autocomplete`, `lookup`, `readonly`, `hidden`.

**Origem das opções:** `enum:<NomeEnum>` (enumeração do `data-model.json` — **transcrever os valores na coluna Opções**) · `endpoint:<METHOD /path>` (lista dinâmica em runtime — Opções pode ficar como *(dinâmica)*) · `domainTable:<tabela>` (**transcrever**) · `static` (**transcrever**) · `—` (campo sem opções).

**Grid / listagem** *(quando a tela exibe tabela; `—` se não aplicável)*

- Colunas exibidas (em ordem):
- Ordenação default:
- Paginação:
- Ações por linha:
- Mensagem de lista vazia:

**Comportamento dos filtros** *(quando a tela tem filtros; `—` se não aplicável)*

- Aplica: ao alterar o campo / ao acionar botão
- Combinação entre filtros: AND / OR
- Limpar todos de uma vez: sim / não
- Persistência do filtro: querystring / sessão / nenhuma
- Dependências entre filtros (ex.: campo B só habilita após campo A):

**Gap associado:** GAP-XXX (se aplicável)

---

<!-- id: pr-ttfv -->

## Time to First Value (TTFV) por jornada

```
TTFV alvo: [X minutos para [persona] realizar [ação principal]]
Passos máximos: [N passos entre login e primeira ação concluída]
Pré-requisitos visíveis ao usuário: [o que precisa ter/saber]
```

---

<!-- id: pr-language -->

## Linguagem e tom

```
Idioma principal:
Tom: Formal / Profissional / Casual
Pessoa do discurso: 2ª ("você") / 1ª ("meu") / impessoal

Glossário da interface:
  [Termo técnico interno] → [Como aparece na UI]

Termos proibidos na UI:
```

---

<!-- id: pr-accessibility -->

## Acessibilidade WCAG 2.2

| Nível | Requisito | Como verificar |
|-------|-----------|----------------|
| A | Imagens com alt text | Axe DevTools |
| A | Navegação por teclado em todos os fluxos | Teste manual |
| AA | Contraste mínimo 4.5:1 | Colour Contrast Analyser |
| AA | Labels em campos de formulário | Axe DevTools |
| AA | Foco não encoberto por header/modal | Teste manual |
| AA | Alvo interativo ≥ 24x24px | Axe DevTools |

---

<!-- id: pr-journeys -->

## Jornadas por persona

*(Método `nielsen-journey`. Pontos de atrito ligados a HU do legacy. Cada jornada segue a espinha padronizada de 5 passos e é auditada contra as 10 heurísticas de Nielsen.)*

### Jornada: [Nome] — persona [Nome]

**Espinha padronizada (5 passos):**

| Passo | Descrição | Estado(s) de UI envolvido(s) |
|-------|-----------|------------------------------|
| 1. Entrada | [como o usuário chega] | |
| 2. Ação principal | [a tarefa central] | |
| 3. Confirmação | [feedback de sucesso] | |
| 4. Erro / recuperação | [o que falha e como recuperar] | |
| 5. Saída / próximo | [para onde vai / próximo passo] | |

**Checklist das 10 heurísticas de Nielsen (heurística × jornada):**

| # | Heurística | Atende? (✅/⚠️/❌) | Evidência / nota |
|---|-----------|--------------------|------------------|
| 1 | Visibilidade do estado do sistema | | |
| 2 | Correspondência sistema ↔ mundo real | | |
| 3 | Controle e liberdade do usuário | | |
| 4 | Consistência e padrões | | |
| 5 | Prevenção de erros | | |
| 6 | Reconhecimento em vez de memorização | | |
| 7 | Flexibilidade e eficiência de uso | | |
| 8 | Estética e design minimalista | | |
| 9 | Ajudar a reconhecer, diagnosticar e recuperar de erros | | |
| 10 | Ajuda e documentação | | |

*(Repetir bloco por jornada crítica de cada persona.)*
