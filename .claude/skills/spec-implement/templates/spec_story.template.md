# spec_story — <NomeDoModulo>

> Memória de implementação deste módulo. Lida pelo spec-implement antes de cada task.
> Atualizada automaticamente ao final de cada task concluída.

---

## Padrões estabelecidos
> Decisões que valem para todas as tasks futuras neste módulo.

- <padrão 1>
- <padrão 2>

---

## Estratégia de testes do módulo
> Como se prova algo neste módulo. Lida na Fase 1 (E1) do spec-implement, antes de
> redescobrir o stack. Preencher/complementar sempre que uma task fixar algo novo.

| Camada | Ferramenta | Localização | Comando |
|--------|-----------|-------------|---------|
| Unit — domínio | <ferramenta> | <caminho> | <comando> |
| Unit — use case | <ferramenta> | <caminho> | <comando> |
| Integração | <ferramenta> | <caminho> | <comando> |
| E2E | <ferramenta ou N/A> | <caminho> | <comando> |
| Carga | <ferramenta ou N/A> | <caminho> | <comando> |

- **Cobertura:** <ferramenta> — threshold <X%> — comando `<comando>`
- **Nomenclatura de teste:** <convenção do projeto>
- **Fixtures / factories reutilizáveis:** <nome — o que produz — onde fica>
- **Pegadinhas do ambiente de teste:** <ex.: Testcontainers exige Docker; seed X precisa rodar antes>

---

## Histórico de tasks

### Task #<id> — <título>
**Data:** YYYY-MM-DD | **State:** Testing

**Implementado:**
- <arquivo ou componente criado/alterado>
- <arquivo ou componente criado/alterado>

**Testes:**
- Cenários: N | Verdes: a | Vermelhos: b | Não cobertos: c
- Por categoria: HAPPY_PATH a/a · INVALID_INPUT b/b · BUSINESS_RULE_VIOLATION c/c · AUTHORIZATION d/d · EDGE_CASE e/e · EXTERNAL_SERVICE_FAILURE f/f
- Camadas criadas: unit(N) · integração(N) · contrato(N) · E2E(N) · carga(N)
- Arquivos de teste: <caminho::nome>, <caminho::nome>
- Cobertura: X% (threshold Y%)
- Não cobertos: <ID> — <motivo>
- Fonte dos cenários: structured | derived | mista

**Decisões:**
- <decisão tomada e motivação>

**Deixado para depois:**
- <o que ficou fora de escopo e por quê>
