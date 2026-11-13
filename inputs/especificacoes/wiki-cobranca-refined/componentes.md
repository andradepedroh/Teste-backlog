---
titulo: Componentes — Cobrança Inteligente
tipo: contract
atualizado_em: 2026-06-15
status: ativo
---

# Componentes

O vocabulário de componentes é **genérico de front-end** — os componentes comuns que se repetem em qualquer UI (button, input, select, table, list, card, tabs, dialog, toolbar, chart…), **agnóstico de framework**. As telas (Cap. 1.2 de cada `Requisitos/<feature>.md`) referenciam o componente pelo **nome genérico** (campo **Componentes:**) e esboçam o layout no bloco ` ```wireframe `. Cada projeto **mapeia** esse vocabulário para a sua lib concreta — aqui o alvo provável é o catálogo de UI do **ServiceNow (Now Experience / componentes nativos)** *(inferência)*; Material Angular, MUI, shadcn/ui e HTML nativo são equivalências possíveis. Este arquivo é só a **referência canônica de vocabulário**.

> Conjunto canônico de exemplo (um entre vários): Material Angular — https://material.angular.dev/components/categories.

## Vocabulário genérico (por categoria)

- **Entrada de dados:** input, select, checkbox, radio, slider, switch, datepicker, form-field.
- **Navegação:** toolbar, tabs, menu, breadcrumb, stepper, sidenav, paginator.
- **Layout:** card, grid, divider, expansion-panel, list.
- **Ações & indicadores:** button, fab, chip, badge, progress, spinner, tooltip.
- **Popups & modais:** dialog, bottom-sheet, snackbar, banner.
- **Dados/tabela:** table, sort, chart.

## DSL wireframe → componente genérico

| Sintaxe | Nó | Componente (genérico) |
|---|---|---|
| `# Texto` | barra de título (largura total) | toolbar |
| `## Texto` | subtítulo / cabeçalho de seção | — |
| `[[ a \| b \| c ]]` | linha de N células iguais | grid / card row |
| `card "Título":` + linhas indentadas | card/região; conteúdo = linhas filhas | card |
| `[Rótulo____]` (≥2 underscores finais) | input | input / form-field |
| `[~ legenda ~]` | placeholder de gráfico | chart |
| `[Texto]` (1+ por linha, sem underscores) | botão(ões) | button |
| `(!) texto` | alerta/banner | banner |
| `- item` | item de lista | list |
| `\| a \| b \|` (linhas consecutivas) | tabela; 1ª linha = cabeçalho | table |
| `texto` (livre) | label/parágrafo | — |
| linha em branco | espaçamento vertical | — |

> Render do navegador é **fat marker, só-layout** (sem texto legível): a **forma** indica o componente.

## Relacionado
- [Índice do wiki](index.md)
- [Telas comuns (arquétipos)](telas-comuns.md)
