# Prompt — backlog de MVP em modo rápido

Copie o bloco abaixo numa sessão nova, troque os dois campos entre `<>` e envie.
Antes, coloque os arquivos de input em `inputs/<slug-do-mvp>/` e faça push.

---

```text
MVP rápido de backlog. Modo simulação, fora da cadeia de skills do harness.

PROJETO: <Nome do MVP>
SLUG: <slug-do-mvp>   (minúsculas, sem espaço; ex.: cobranca-v2)
INPUTS: inputs/<slug>/   SAÍDA: outputs/mvp-<slug>/   KIT: outputs/mvp-kit/
DECISOR: Pedro

OBJETIVO
Kanban com épicos (funcionalidades) e histórias, só a descrição. Sem critérios de
aceite, tarefas, horas, contratos ou testes. Serve para decidir o escopo e testar o prompt.

ECONOMIA (obrigatório)
- Não invoque skills spec-* nem leia .claude/skills/. Não rode validadores do harness.
- Leia cada input uma vez só. PDF, PPTX e DOCX: extraia o texto com um comando para
  outputs/mvp-<slug>/_texto/ e trabalhe sobre os .txt. Arquivo grande: leia o sumário
  e as seções relevantes, nunca o arquivo inteiro de novo.
- Não escreva HTML. Escreva só os JSON; os scripts do KIT geram as páginas:
    python3 outputs/mvp-kit/gerar_kanban.py outputs/mvp-<slug>
    python3 outputs/mvp-kit/gerar_pendencias.py outputs/mvp-<slug>
- Ao mudar o backlog, edite só os itens afetados (Edit). Não reescreva o JSON inteiro.
- Não releia arquivos que você acabou de escrever. Sem subagentes.
- Respostas no chat: no máximo 6 linhas. O conteúdo fica nos arquivos.

PASSOS
1. Inventário: liste os arquivos de INPUTS (nome, tipo, tamanho). Dado pessoal real
   (CPF, nome, e-mail, telefone) → anonimize antes de versionar.
2. Notas: grave outputs/mvp-<slug>/notas.md com até 120 linhas, só fatos úteis ao
   backlog, cada um com fonte curta (arquivo + página ou seção): problema, atores,
   capacidades pedidas, regras citadas, integrações, restrições e o que está fora.
3. Backlog: grave outputs/mvp-<slug>/backlog.json no formato do cabeçalho de
   gerar_kanban.py. Regras:
   - 4 a 8 épicos, cada um uma capacidade de negócio com objetivo de 1 frase.
   - 3 a 10 histórias por épico. Uma história = uma entrega que o usuário percebe.
   - descricao: "Como <ator>, quero <ação>, para <resultado>." Até 35 palavras.
     Sem jargão técnico.
   - status: pronta | depende-decisao | bloqueada | fora-do-mvp.
   - Toda história tem "fonte". Sem fonte, não entra: vira pendência.
   - IDs: EP-01…, HU-01… sequenciais no backlog inteiro.
4. Pendências: grave outputs/mvp-<slug>/pendencias.json (formato no cabeçalho de
   gerar_pendencias.py). Regras:
   - Só decisões que mudam o backlog: escopo do MVP, ator, conflito entre fontes,
     regra que falta.
   - Máximo de 8 por rodada, ordenadas por impacto. Cada pergunta se entende sozinha.
   - 2 a 4 opções, cada uma com o efeito no backlog; marque a recomendada.
   - Liste em "afeta" os IDs de épico ou história.
5. Rode os dois scripts. Envie kanban.html e pendencias.html com SendUserFile
   (display=render). Faça commit e push na main. Pare e espere minha resposta.

RODADAS
Eu respondo colando "Respostas rodada N: PEND-01=2; PEND-02=1 (obs); ...".
- Aplique cada escolha só nos itens afetados. "=?" fica para a próxima rodada.
- Registre as decisões em outputs/mvp-<slug>/decisoes.md (1 linha cada:
  rodada, id, escolha, efeito).
- Suba a versão do backlog (0.1 → 0.2), regenere, envie e faça commit.
- Sem pendência nova: diga "backlog estável" e pare.

GUARDRAILS
- Não invente: lacuna vira pendência, nunca suposição silenciosa.
- Não edite a zona imutável (CLAUDE.md, .claude/). Sem --force e sem --no-verify.
- Português do Brasil em todo o conteúdo.
```

---

## O que cada arquivo faz

| Arquivo | Papel |
|---|---|
| `gerar_kanban.py` | Lê `backlog.json` e gera `kanban.html`: colunas por épico, cartões só com descrição, filtro por texto e por status |
| `gerar_pendencias.py` | Lê `pendencias.json` e gera `pendencias.html`: um botão por opção, «Copiar respostas» monta o texto para colar no chat |
| `exemplo/` | Kit rodado sobre o backlog atual da Cobrança 2.6, para ver o visual |

## Rodar no seu computador (Python 3)

```bash
python3 outputs/mvp-kit/gerar_kanban.py outputs/mvp-kit/exemplo
```

```bash
python3 outputs/mvp-kit/gerar_pendencias.py outputs/mvp-kit/exemplo
```
