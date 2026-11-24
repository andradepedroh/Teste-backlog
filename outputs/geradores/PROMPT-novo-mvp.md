# Prompt — novo MVP de backlog com o Harness Elo v2

Preencha os campos entre `<< >>` e cole tudo numa sessão nova do Claude Code.

---

## Objetivo
Gerar o backlog do MVP **<<NOME DO PROJETO>>** com o Harness Elo v2 e entregar, no fim,
`outputs/backlog/kanban.html` (colunas = épicos/módulos, cartões = histórias com descrição,
critérios de aceite, tarefas e dependências; **sem horas**). É simulação: o que importa é o backlog
final, com o menor consumo de tokens possível.

## Contexto fixo
- Repositório (só GitHub, push direto na `main` no Explore e no Plan): **<<URL DO REPOSITÓRIO>>**
- Harness: **<<zip do harness anexado | já está no repositório>>** — se vier zip, configurar o projeto e rodar o `spec-init`.
- Insumos (anonimizar dado pessoal antes de versionar): **<<lista dos arquivos anexados>>** → `inputs/`
- Decisor: **<<NOME>>** · Legado: **<<sim | não>>** · Plataforma/stack conhecida: **<<ex.: ServiceNow | a definir>>**
- Repositório de referência com os geradores da simulação anterior:
  `https://github.com/andradepedroh/Teste-backlog` → `outputs/geradores/` (ler o README antes de escrever qualquer gerador).

## Escopo da cadeia
- **Rodar:** Explore (4 documentos + gaps + fecho) → spec-ingest → spec-legacy (skip se sem legado) →
  spec-product → spec-iterate → spec-tech-rules → spec-hld → revisao-de-seguranca → spec-data-model →
  spec-api-contracts → spec-test-plan → spec-tasks → spec-security-review → spec-tasks-html → kanban.
- **Pular:** spec-benchmark, spec-prototype (registrar isenção do protótipo), spec-estimate, spec-tasks-azure.
- **Níveis do backlog:** épico (= módulo) › história (= requisito) › tarefa. Sem horas (`effortHours` omitido).

## Regras de eficiência (obrigatórias)
1. **Gerar por script, não à mão.** Cada artefato grande sai de um script Python em `outputs/geradores/`,
   adaptado dos moldes do repositório de referência. Corrigir o script e regerar — nunca reescrever o artefato inteiro.
2. **Ler pouco e uma vez.** PDF/PPTX: extrair texto uma vez para o scratchpad e consultar com `grep`/`sed -n`.
   Artefatos estruturados: usar as saídas `--json` dos verificadores (`check-flowmap.py`, `check-hld.py`), nunca reparsear o `.md`.
3. **Validar em silêncio.** Mostrar só a contagem de erros/avisos e as primeiras ocorrências por código; corrigir em lote.
4. **Sem relato longo.** Entre etapas, uma linha de status. Sem resumo do que já foi feito.
5. **Sem subagentes**, salvo se eu pedir.
6. **Um commit por etapa**, com a linha correspondente no `outputs/spec/sync-log.md`.
7. Rodar tudo da raiz do repositório, `python3 -I`, ferramentas por rota efêmera (`npx --yes …`) sem instalar nada.

## Decisões sem me perguntar
- Aceitar a recomendação das skills sempre que houver uma (kickoff, modo, profundidade, níveis).
- GAP que não bloqueia a cadeia: seguir aberto e registrado. GAP que bloqueia uma funcionalidade:
  marcar as histórias como **⚠️ BLOQUEADO (GAP-nnn)** e seguir.
- Quadro técnico: inferir dos insumos; só perguntar o que não houver como inferir.

## Quando precisar de mim — página de pendências
- **Junte tudo numa rodada** e me interrompa no máximo em 3 momentos: (1) lacunas do Explore, (2) fecho do
  spec-iterate, (3) quadro técnico. Fora disso, só se algo bloquear a cadeia inteira.
- Para cada rodada, monte um JSON e gere a página com
  `python3 -I outputs/geradores/pendencias.py <decisoes.json> outputs/pendencias/rodada-N.html`
  (formato em `pendencias-exemplo.json`): **um cartão por decisão**, pergunta curta, até 3 linhas de contexto,
  **um botão por opção** com o efeito de cada uma e a recomendada marcada.
- Me envie a página para abrir. Eu respondo colando a linha que a página monta (`GAP-001=A; KICKOFF-01=B`);
  aplique as respostas sem pedir confirmação.

## Entrega final
- `outputs/backlog/kanban.html` gerado por `outputs/backlog/gerar-kanban.py` a partir de `outputs/spec/tasks.json`.
- Mensagem final curta: números (épicos, histórias, tarefas, tarefas de segurança, histórias bloqueadas),
  decisões que você tomou sem mim e o hash do último commit.
