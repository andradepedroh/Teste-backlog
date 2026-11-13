# Especificação Funcional — <produto>

> **Fase:** Explore · **Versão:** 0.1 · **Status:** cobertura completa, profundidade preliminar
> **Documentos irmãos:** [HLD](./hld-funcional.md) · [Técnica](./especificacao-tecnica.md) · [Modelo de Dados](./modelo-de-dados.md) · [GAPs](./gaps.md)
>
> <!-- Este documento existe para três coisas: entendimento, revisão preliminar e geração do
>      protótipo. Backlog, critério de aceite e cenário de teste são do Plan — não os escreva aqui. -->

## Changelog
| Versão | Data | Mudança |
|---|---|---|
| 0.1 | <data> | versão inicial |

## 1. Personas e perfis de acesso

### 1.1 Personas
| Persona | Perfil | Papel no processo |
|---|---|---|
| <persona> | <perfil> | <o que essa pessoa faz> |

### 1.2 Matriz de acesso
<!-- Uma linha por ação relevante; uma coluna por perfil. Marque ✅ / — . -->

| Ação | <perfil> |
|---|:---:|
| <ação> | — |

## 2. Navegação e telas
<!-- Esta tabela é ENTRADA do protótipo, não saída dele. O mapeamento tela → componente vive na
     tabela UI→negócio do prototype.md — não o duplique aqui. -->

| Tela/Aba | Rota | Conteúdo | Visível para |
|---|---|---|---|
| <tela> | <rota> | <o que aparece na tela> | <perfil> |

## 3. Funcionalidades e regras de negócio, por módulo
<!-- Cobertura completa: TODA necessidade de negócio tem que aparecer como RF-nnn. As RN são
     preliminares — o Plan as aprofunda. Toda RN declara quais RF ela afeta. -->

### MOD-<CODIGO> — <nome do módulo>

**Funcionalidades**

| ID | Funcionalidade | Descrição |
|---|---|---|
| RF-<nnn> | <nome da funcionalidade> | <o que ela faz> |

**Regras de negócio**

| ID | Regra | Afeta |
|---|---|---|
| RN-<nnn> | <enunciado da regra> | RF-<nnn> |
