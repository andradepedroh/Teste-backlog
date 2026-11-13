# spec-implement — a devolutiva em chat (passo J)

> Lido no passo J, antes de escrever a devolutiva. A obrigação, o público e o porquê estão no
> `SKILL.md`, § «J — Devolutiva em chat».

### Formato

```markdown
## <TASK-ID> — <título em português simples>

**Em uma frase:** <o que o usuário do sistema passa a conseguir fazer que antes não conseguia>

### O que muda para o negócio
- **Situação antes:** <o que acontecia / o que faltava>
- **Situação agora:** <a ação concreta: quem clica no quê e o que recebe de volta>
- **Regras que passaram a valer:** <cada regra em linguagem comum — "não deixa cadastrar dois
  clientes com o mesmo CPF"; citar o código da regra entre parênteses no fim, nunca no lugar dela>
- **O que ainda NÃO faz:** <limite honesto do que foi entregue>

### As decisões técnicas, sem jargão
<de 1 a 4 decisões que mudam o comportamento, o risco, o custo ou o prazo — uma por bloco:>

**<a decisão, em uma frase que um leigo entende>**
- **O problema:** <o que daria errado sem ela, contado pela consequência para o usuário ou para
  o negócio — "o cliente receberia duas cobranças", não "haveria race condition">
- **Como funciona, numa comparação do dia a dia:** <uma analogia curta e FIEL ao que o código faz>
- **O que mais dava para fazer, e por que não:** <a alternativa que foi de fato considerada e o
  motivo de ter perdido: custo, risco, prazo, regra do projeto>
- **O preço da escolha:** <o que ficou mais lento, mais caro, mais limitado ou fica para depois>

### Como foi feito (para quem for mexer no código)
- **Caminho da informação:** <o fluxo em 3–6 passos curtos, em português: "a tela envia os dados →
  o serviço confere as regras → grava no banco → devolve a confirmação para a tela">
- **Arquivos alterados — e o papel de cada um:**
  - `caminho/do/arquivo.ext` — <uma linha dizendo o que esse arquivo faz, não o que é>
- **Onde cada decisão mora no código:** <para cada decisão da seção anterior, o arquivo e o trecho
  em que ela está — sem repetir a explicação>
- **Se der problema, olhe primeiro:** <o arquivo/ponto mais provável e o sinal a procurar (log,
  mensagem de erro)>

### Como sabemos que funciona
- <um cenário por linha, em português: "quando o CPF já existe, o sistema recusa e mostra
  'CPF já cadastrado'"> — N cenários testados, todos passando
- **O que não deu para testar automaticamente:** <o quê e por quê — ou "nada">
- **Comandos rodados:** `<comando>` → <resultado>

### Se quiser conferir na sua máquina
1. <passo>
2. <passo>
```

Seções vazias saem do texto — não escrever "N/A" nem manter cabeçalho sem conteúdo. Se a task não
mexe em interface, "quem clica no quê" vira "quem chama o quê" (o sistema que consome o serviço).

### Regras de escrita (é aqui que "linguagem simples" vira verificável)

<!-- linguagem-clara:xref -->
> **As 10 regras da seção "Linguagem clara" (no início desta skill) valem integralmente aqui** —
> não repetir nem renumerar. A devolutiva do passo J acrescenta só **duas regras próprias**:

- **Sem trecho de código**, exceto comandos para copiar e colar. Quem quer o código abre o diff.
- **Cabe na tela.** Alvo de ~55 linhas. Task grande corta detalhe, não corta seção: o que não
  couber vai para o `spec_story.md`, que é o lugar do detalhe.

**Regras da seção "As decisões técnicas, sem jargão"** — além das duas acima:

- **Zero termo técnico.** Nem com explicação entre parênteses: aqui o termo some e fica só o que ele
  faz. "índice único" vira "o próprio banco de dados passa a recusar um segundo cadastro igual". Se
  a decisão não se explica sem o termo, ela foi mal entendida — reescreva antes de enviar.
- **Toda decisão responde "e daí?" para o negócio.** O problema é contado pela consequência que a
  pessoa reconhece (dinheiro, cliente, prazo, retrabalho, dado errado, segurança), nunca pelo
  mecanismo.
- **A analogia não promete mais do que o código faz.** Se o código só reduz um risco, a comparação
  não pode sugerir que ele some. Analogia que exige ressalva longa é analogia errada — troque.
- **Só alternativa que foi de fato considerada.** Não invente opção para parecer criterioso. Se não
  havia escolha real (a rule do projeto mandava), diga isso em uma linha e omita o item.
- **Entra o que importa para quem decide.** Decisão que muda comportamento, risco, custo ou prazo
  entra. Seguir o padrão do projeto não é decisão: no máximo uma linha final "o resto segue o padrão
  já usado no projeto". Nenhuma decisão relevante → a seção sai.
- **O preço é obrigatório.** Toda escolha custa algo. Se você não sabe o preço, não entendeu a
  decisão.

### Exemplo preenchido (referência de tom e granularidade)

```markdown
## TASK-014 — Impedir cadastro de cliente com CPF repetido

**Em uma frase:** o sistema agora recusa o cadastro de um cliente cujo CPF já existe, em vez de
criar um segundo registro para a mesma pessoa.

### O que muda para o negócio
- **Situação antes:** dava para cadastrar a mesma pessoa duas vezes. O time descobria só depois,
  quando duas fichas do mesmo cliente apareciam na busca.
- **Situação agora:** ao salvar um cliente novo, se aquele CPF já estiver cadastrado, a tela mostra
  "CPF já cadastrado para <nome>" e não grava nada.
- **Regras que passaram a valer:** um CPF pertence a um único cliente ativo; um cliente que foi
  desativado não bloqueia o CPF — dá para cadastrar de novo (RN-012).
- **O que ainda NÃO faz:** não junta as fichas duplicadas que já existem no banco. Isso é outra
  task.

### As decisões técnicas, sem jargão

**A checagem de CPF repetido acontece em dois lugares, e não em um só**
- **O problema:** se duas pessoas da equipe cadastrassem o mesmo cliente no mesmo segundo, as duas
  telas perguntariam "esse CPF já existe?", as duas ouviriam "não" e as duas gravariam. O cliente
  ficaria duplicado mesmo com a regra no lugar.
- **Como funciona, numa comparação do dia a dia:** é como um evento com recepcionista e catraca. A
  recepcionista confere a lista e explica com educação por que você não pode entrar duas vezes. A
  catraca não explica nada, mas não deixa passar quem já passou, mesmo se a recepcionista se
  distrair.
- **O que mais dava para fazer, e por que não:** só a recepcionista (a checagem na tela) era mais
  simples, mas deixava passar o caso dos dois cadastros ao mesmo tempo. Só a catraca (a trava no
  banco de dados) barrava tudo, mas o usuário veria uma mensagem de erro genérica, sem entender o
  motivo.
- **O preço da escolha:** a regra fica escrita em dois lugares. Se um dia o negócio mudar o que
  conta como "mesmo cliente", os dois precisam mudar juntos.

### Como foi feito (para quem for mexer no código)
- **Caminho da informação:** a tela envia os dados do cliente → o serviço confere se o CPF já
  existe → se existir, devolve o erro; se não, grava no banco e devolve a confirmação.
- **Arquivos alterados — e o papel de cada um:**
  - `src/domain/Cliente.java` — onde ficam as regras do que é um cliente válido
  - `src/service/ClienteService.java` — onde a checagem de CPF repetido acontece antes de gravar
  - `src/repository/ClienteRepository.java` — a classe que conversa com o banco; ganhou a consulta
    "existe cliente ativo com este CPF?"
  - `migrations/V7__indice_unico_cpf.sql` — cria um índice único (o próprio banco passa a recusar
    duplicados, mesmo se dois cadastros chegarem no mesmo instante)
- **Onde cada decisão mora no código:** a "recepcionista" é a checagem em `ClienteService.java`; a
  "catraca" é o índice único criado em `V7__indice_unico_cpf.sql`.
- **Se der problema, olhe primeiro:** `ClienteService.java`, no log `cliente.cpf.duplicado` — ele
  registra o CPF e o id do cliente que já existia.

### Como sabemos que funciona
- quando o CPF é novo, o cliente é criado normalmente
- quando o CPF já existe e o cliente está ativo, o sistema recusa com "CPF já cadastrado"
- quando o CPF existe mas o cliente foi desativado, o cadastro é aceito
- quando o CPF vem vazio ou com menos de 11 dígitos, o sistema recusa antes de consultar o banco
- quando duas requisições com o mesmo CPF chegam juntas, só uma grava; a outra recebe o erro
— 5 situações testadas, todas passando.
- **O que não deu para testar automaticamente:** nada.
- **Comandos rodados:** `./mvnw test` → 128 testes, 0 falhas · `./mvnw verify` → build ok

### Se quiser conferir na sua máquina
1. `docker compose up -d` (sobe o banco)
2. `./mvnw test -Dtest=ClienteServiceTest`
```

### Checagem antes de enviar

Reler uma vez e responder quatro perguntas. Qualquer "não" volta para o texto:

- Uma pessoa que nunca leu código entende **o que mudou para o usuário** e **por que cada decisão
  técnica foi tomada, e o que ela custa**, lendo só as duas primeiras seções?
- Um dev que nunca viu este sistema saberia **em qual arquivo começar** se precisasse alterar isso
  amanhã?
- Sobrou algum termo técnico na seção de decisões? (Lá não pode haver nenhum, nem explicado.)
- Sobrou algum termo técnico ou sigla **sem** a explicação de meia linha nas outras seções?

### Relação com os outros relatórios

| Destino | Público | Conteúdo |
|---|---|---|
| Comentário do work item (passo H, Mode A) | quem audita, QA, tech lead | registro técnico completo: blueprint, matriz, comandos, divergências |
| `spec_story.md` (passo I) | o próximo agente/task | memória factual e terse do módulo |
| **Devolutiva em chat (passo J)** | **a pessoa que está lendo agora, técnica ou não** | **explicação em linguagem simples: o que mudou no negócio, as decisões técnicas e o preço delas sem jargão, como o código faz isso** |

Os três coexistem. A devolutiva **não** substitui nenhum dos outros dois, e nenhum deles dispensa a
devolutiva — inclusive em Mode A, onde o comentário do ADO já foi escrito.

**Quando a execução falha** (validação vermelha, bloqueio, nada implementado), a devolutiva
acontece do mesmo jeito, com as seções ajustadas: o que se tentou fazer, onde parou, o que a
mensagem de erro quer dizer em português, e o que é preciso decidir ou destravar para seguir.
Falha explicada é entrega de informação; falha silenciosa não é.

**Quando o G3 parou** (`parar`), a devolutiva diz também, em português simples: o que a validação
independente achou e por que o ciclo parou (limite de tentativas, correção que se desfez, dúvida que
só uma pessoa decide, ou o corretor recusou o item — e o motivo dele); que o estado do work item não
mudou; e, se o corretor editou arquivos, quais são e a pergunta ao usuário — manter ou descartar essas
edições. Falha de comando que já existia antes da task (linha de base) aparece como o que é: um
problema do projeto, não desta entrega.
