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
| 1.0 | 2026-11-13 | criação do manifesto — projeto ServiceNow - 2.6 Cobrança |
| 1.1 | 2026-11-13 | repositórios no GitHub (andradepedroh); docs = Teste-backlog. Azure DevOps fica para o backlog do Plan |

## Repositórios

| Papel | Repositório no ADO | Pasta local | Para que serve |
|---|---|---|---|
| docs | `Teste-backlog` | `Teste-backlog` | artefatos de fase; publicado como wiki |
| codigo | `servicenow-cobranca` (a criar no Deliver) | `servicenow-cobranca` | código da solução |
| prototipo | `servicenow-cobranca-prototipo` (a criar antes da spec-prototype) | `servicenow-cobranca-prototipo` | protótipo de alta fidelidade |

<!-- harness:workspace -->
- papel: docs
  repositorio: https://github.com/andradepedroh/Teste-backlog
<!-- codigo entra só no Deliver — descomente as três linhas abaixo quando o repositório de
     código existir, e preencha os tokens:
- papel: codigo
  repositorio: https://github.com/andradepedroh/servicenow-cobranca
  branch-de-integracao: main
-->
- papel: prototipo
  repositorio: https://github.com/andradepedroh/servicenow-cobranca-prototipo
<!-- /harness:workspace -->

> `branch-de-integracao` é opcional (default `main`). Declare quando o repo integrar em `master`,
> `develop` ou outro — sem isso o gate não consegue calcular os commits do push e bloqueia.
>
> Cardinalidade: **exatamente um** `docs`; zero ou mais `codigo`; zero ou mais `prototipo`.
> O manifesto nasce no Explore com `docs` e `prototipo`; `codigo` entra no Deliver.
>
> Valide com: `node .claude/hooks/workspace.mjs --validar`
