# Workspace do projeto — repositórios e papéis

> **Fonte única de "qual repo é qual".** Lido por `.claude/hooks/workspace.mjs`, e por ele pelo
> `delivery-gate` e pelo `estado`. Vive na **raiz** do repositório de docs — versionado,
> revisável em PR.
>
> **Papel é chave de política, não rótulo:** `codigo` é fiscalizado pelo gate (é onde US integra);
> `docs` e `prototipo` são livres (nunca integram US). O vocabulário é fechado — repositório com
> papel não declarado tem o push **negado**. Acrescentar papel novo é mudança de design.
>
> **Casamento pelo nome do repositório** — último segmento da URL, sem `.git`, case-insensitive.
> Não pelo caminho local: renomear a pasta não redefine política.

## Changelog
| Versão | Data | Mudança |
|---|---|---|
| 1.0 | <data> | criação do manifesto |

## Repositórios

| Papel | Repositório no ADO | Pasta local | Para que serve |
|---|---|---|---|
| docs | `<repo-docs>` | `<pasta>` | artefatos de fase; publicado como wiki |
| codigo | `<repo-codigo>` | `<pasta>` | código da solução |
| prototipo | `<repo-prototipo>` | `<pasta>` | protótipo de alta fidelidade |

<!-- harness:workspace -->
- papel: docs
  repositorio: https://dev.azure.com/<org>/<projeto>/_git/<repo-docs>
<!-- codigo entra só no Deliver — descomente as três linhas abaixo quando o repositório de
     código existir, e preencha os tokens:
- papel: codigo
  repositorio: https://dev.azure.com/<org>/<projeto>/_git/<repo-codigo>
  branch-de-integracao: main
-->
- papel: prototipo
  repositorio: https://dev.azure.com/<org>/<projeto>/_git/<repo-prototipo>
<!-- /harness:workspace -->

> `branch-de-integracao` é opcional (default `main`). Declare quando o repo integrar em `master`,
> `develop` ou outro — sem isso o gate não consegue calcular os commits do push e bloqueia.
>
> Cardinalidade: **exatamente um** `docs`; zero ou mais `codigo`; zero ou mais `prototipo`.
> O manifesto nasce no Explore com `docs` e `prototipo`; `codigo` entra no Deliver.
>
> **Layout no disco.** Multi-repo é a sessão aberta na **pasta-pai**, com os repositórios lado a
> lado como subpastas dela (`portal-docs/`, `portal-api/`, `portal-proto/`); o repo de docs é a
> única subpasta com `outputs/explore/` e `outputs/spec/`. A coluna «Pasta local» descreve esse
> layout, relativo à pasta-pai. Repositório **aninhado** dentro do de docs (`codigo/` no repo de
> docs) **não é suportado**: com a sessão no repo de docs o harness cai em mono-repo e o
> `delivery-gate` trata todo push como código — inclusive o do próprio repo de docs, que passa a
> ser negado sem auditoria de US. O `estado` e o `--validar` avisam quando a «Pasta local» declara
> um repositório dentro da pasta do de docs.
>
> Valide com: `node .claude/hooks/workspace.mjs --validar`
