# Isenção do delivery-gate — trabalho não-US

<!-- Copie para <docs>/outputs/spec/auditorias/_isencoes/<repo>__<branch>.md e commite.
     Válvula documentada para branch de feature que NÃO entrega user story (ex.: tooling do
     harness). Não há ledger agregado: o registro é o PRÓPRIO ARQUIVO, versionado no git com
     autor e data — é essa a trilha de auditoria.
     O nome do arquivo é cosmético — o gate casa pelos CAMPOS abaixo. -->

<!-- gate:isencao -->
repositorio: https://dev.azure.com/<org>/<Projeto>/_git/<Repo>
branch: <nome exato do branch>
autor: <seu nome>
data: <AAAA-MM-DD>
motivo: <por que este branch não entrega US — concreto e verificável>
<!-- /gate:isencao -->

> **`repositorio` é obrigatório em workspace multi-repo:** a chave é composta (repo + branch),
> porque `feat/x` em dois repositórios são coisas diferentes. Isenção sem esse campo não casa com
> nada — isenção morta é preferível a isenção válida para o repositório errado.
>
> Não é preciso isenção para publicar a wiki: push em repositório de papel `docs` nunca foi
> integração de US e o gate silencia sozinho.
>
> **O mesmo diretório também serve à isenção do fecho Explore→Plan** (pré-projeto legitimamente
> reduzido — ver `.claude/rules/harness/explore.md`), que lê o mesmo bloco `gate:isencao` mas só
> os campos `repositorio`, `autor`, `data` e `motivo` — sem `branch`, porque naquele ponto ainda
> não há US. Preencher os cinco campos aqui cobre os dois gates com um único arquivo.
