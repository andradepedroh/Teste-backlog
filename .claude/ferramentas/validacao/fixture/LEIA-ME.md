# Fixture de calibração do `validar.mjs`

Projeto sintético para medir se os validadores acham o que devem. **Dado sintético** (CPF
`000.000.000-00`, e-mail `@exemplo.test`).

- `base/` é o commit.
- `entrega/` é o que a task mudou, por cima da base.
- `tasks.json` é a task, no formato da `spec-tasks`.
- `esperado.json` diz o que cada camada tem que achar.

## Os defeitos plantados na `entrega/`

Os comentários **não** estão no código de propósito: o validador tem que achar pelo comportamento,
não por uma nota que o entregue.

| Defeito | Onde | Quem tem que achar |
|---|---|---|
| Compara o estoque com zero, não com a quantidade pedida | `pedido.service.js` | regras de negócio |
| Não limita o pedido a 10 itens, e a mensagem do limite não existe | `pedido.service.js` | regras de negócio e o determinístico |
| O teste de recusa usa `assert.rejects` sem conferir a mensagem | `test/pedido.service.test.js` | testes e o determinístico |
| CPF e e-mail do cliente no log | `pedido.service.js` | segurança e observabilidade |
| Uma consulta de estoque por item, embora exista `buscarEstoques` | `pedido.service.js` | performance |
| Erro da gravação engolido no `catch` | `pedido.service.js` | observabilidade |
| `fetch` dentro do componente e dinheiro formatado no JSX | `ResumoPedido.jsx` | rules técnicas |

## Como calibrar com os agentes de verdade

A camada determinística já é cobrada pelo `validacao.test.mjs`. A dos modelos precisa dos agentes de
`.claude/agents/` carregados, ou seja, de uma **sessão nova** aberta depois que eles estão na pasta.
Sem subagente (Kiro), só a camada determinística se calibra: rode o ciclo com `--sem-agentes`.

1. Monte o projeto numa pasta temporária, **fora** do repositório do harness:

   ```bash
   F=.claude/ferramentas/validacao/fixture; T=$(mktemp -d)
   cp -r "$F/base/." "$T/" && mkdir -p "$T/outputs/spec" && cp "$F/tasks.json" "$T/outputs/spec/"
   printf 'outputs/spec/validacao/\n' > "$T/.gitignore"
   git -C "$T" init -q && git -C "$T" add -A && git -C "$T" -c user.name=f -c user.email=f@f commit -qm base
   cp -r "$F/entrega/." "$T/" && echo "$T"
   ```

2. Na sessão do harness, peça para rodar o ciclo na task `TASK-FIX-001`, com `--repo` apontando
   para essa pasta e os comandos rodando a partir dela.
   - Use `--cmd-testes "node --test"`, **sem argumento**. É o comando completo da fixture: pega os
     testes `.js` e os `.ts` que o corretor criar.
   - Não passe um arquivo só, como `test/pedido.service.test.js`. Os testes novos ficam fora da
     checagem por código; foi o que aconteceu na recalibração de 2026-10-16.
3. Compare o relatório `outputs/spec/auditorias/TASK-FIX-001.validacao.json` com o
   `esperado.json`. Conte para cada validador:
   - o que ele achou do esperado;
   - o que achou a mais (falso positivo);
   - quantos achados foram descartados por evidência que não confere.

   Anote também os tokens que o rodapé de cada agente mostrou.
4. Rode duas ou três vezes. Veredito que muda entre rodadas com a mesma entrada é variação, e é o
   número que decide se vale um juiz de outro fabricante.
