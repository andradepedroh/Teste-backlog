# Modelo de Dados — <produto>

> **Fase:** Explore · **Versão:** 0.1 · **Status:** preliminar e **opcional**
> **Documentos irmãos:** [HLD](./hld-funcional.md) · [Funcional](./especificacao-funcional.md) · [Técnica](./especificacao-tecnica.md) · [GAPs](./gaps.md)
>
> <!-- Opcional: se o pré-projeto não chega ao modelo, dispense-o com uma linha no gaps.md dizendo
>      por quê. Decisão não registrada é decisão não tomada. A autoridade definitiva é o
>      data-model.json que a spec-data-model emite no Plan. -->

## Changelog
| Versão | Data | Mudança |
|---|---|---|
| 0.1 | <data> | versão inicial |

## 1. Entidades principais
| Entidade | Papel no sistema | Atributos principais | Usada por |
|---|---|---|---|
| <entidade> | <o que representa> | <atributos> | RF-<nnn> |

## 2. Relacionamentos

```mermaid
erDiagram
  <ENTIDADE_A> ||--o{ <ENTIDADE_B> : "<relação>"
```
