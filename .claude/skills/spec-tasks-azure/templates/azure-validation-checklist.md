# Checklist de Validação Azure DevOps (Modo Offline)

Use este checklist quando não for possível validar via REST API (sem permissão ou offline).
Confirme cada item manualmente antes de executar `npm run push`.

## 1. Process Template

- [ ] Identificar o process template do projeto ADO:
  - Abrir o projeto no Azure DevOps → Settings → Process
  - Anotar: `___________________` (Agile | Scrum | CMMI | Custom)

## 2. Work Item Types disponíveis

Para cada nível em `metadata.backlogHierarchy.chosen`, confirmar que o WIT existe no processo:

| Nível JSON | WIT a usar | Existe no processo? |
|------------|------------|---------------------|
| epic | `Epic` | [ ] Sim [ ] Não |
| feature | `Feature` | [ ] Sim [ ] Não |
| story | `User Story` / `Product Backlog Item` | [ ] Sim [ ] Não |
| task | `Task` | [ ] Sim [ ] Não |

**Se algum WIT não existir:** atualizar as variáveis `AZURE_DEVOPS_WIT_*` no `.env` com o nome correto
do WIT no processo. `metadata.azureDevOps.workItemTypes.<nível>.wit` é apenas documentação/referência —
o código não lê esse campo; o nome do WIT usado na criação vem exclusivamente do `.env`.

## 3. Hierarquia permitida pelo processo

Confirmar que o processo permite a cadeia de parent-child escolhida:

| Relação pai → filho | Permitida? |
|--------------------|------------|
| Epic → Feature | [ ] Sim [ ] Não |
| Feature → User Story | [ ] Sim [ ] Não |
| User Story → Task | [ ] Sim [ ] Não |
| Epic → User Story (sem Feature) | [ ] Sim [ ] Não |

**Referência:** Boards → Work Items → [tipo] → Rules → Parent rules

## 4. Epic pai

- [ ] O Epic com ID `___________` existe no projeto ADO
- [ ] O Epic está no projeto correto: `___________________`
- [ ] Tenho permissão para criar work items filhos neste Epic

## 5. Credenciais

- [ ] `AZURE_DEVOPS_PAT` configurado no `.env` com permissão `Work Items: Read & Write`
- [ ] `AZURE_DEVOPS_ORG` correto: `___________________`
- [ ] `AZURE_DEVOPS_PROJECT` correto: `___________________`

## 6. Dry-run recomendado

Antes do push real, testar com um único story/task para confirmar que a hierarquia funciona:
```bash
# Criar um tasks.json mínimo com 1 story + 1 task e testar primeiro
node cli.mjs --input tasks.test.json
```

## 7. Leitura da task pelo desenvolvedor <!-- linguagem-clara:checklist -->

O work item publicado é a última parada antes de quem vai implementar. Abra **duas ou três** tasks
que vão subir e confira (§ "Linguagem clara" do `SKILL.md`):

- [ ] O resumo de contexto (`selfContainedSummary`) faz sentido para quem nunca viu o projeto, lendo
      uma vez, sem abrir outro documento
- [ ] Nenhuma sigla aparece sem expansão na primeira vez (nem as do negócio)
- [ ] Nenhuma regra aparece só como código (`RN-012`, `RF-08`) no lugar do texto dela
- [ ] Nenhum jargão de processo vazou para o texto ("gate", "blueprint", "matriz de cenários",
      "compact-prose", nome de validator)
- [ ] Cada arquivo, tabela ou rota citado vem com o papel dele
- [ ] O título de cada cenário de aceite está no formato "quando X, o sistema Y"
- [ ] Cada bloco técnico denso (contrato de API, colunas de tabela) abre com uma frase em português
      dizendo o que ele significa

**Se algum item falhar:** avisar no chat e corrigir na origem (`tasks.json`, via `spec-tasks`) antes
de publicar. Reescrever só no Azure DevOps cria divergência entre o work item e o artefato.

---

*Após confirmar todos os itens, executar `npm run push`.*
