# Leitura executiva — [Nome do Projeto]

> **Este arquivo é OPCIONAL.** Sem ele, o relatório gera um panorama automático a partir
> dos artefatos e da execução dos testes. Preencha-o quando quiser que a voz do consultor
> apareça na abertura do relatório — é o que transforma um dump de métricas numa entrega.
>
> Grave em `outputs/spec/status/executive-summary.md`. As seções são reconhecidas pelo
> **heading `##`**; o que você não escrever simplesmente não é renderizado. Ordem de
> exibição: Resumo → Entregue → Decisões → Riscos → Pendências → Recomendações → Próximos passos.
>
> Regra: **nada aqui pode ser inverificável**. Todo número citado deve estar rastreável a
> um artefato ou à execução dos testes — o relatório mostra as duas coisas lado a lado, e
> uma divergência entre a narrativa e os dados é imediatamente visível para o cliente.
> Apague este bloco de instruções antes de entregar.

## Resumo

[2 a 4 frases: onde o projeto está, o que mudou desde o último reporte e qual a mensagem
principal que o cliente deve levar desta leitura. Evite adjetivos sem número.]

## O que foi entregue

[O que está pronto e verificado neste ciclo, do ponto de vista do NEGÓCIO — não da task.
Prefira "cadastro de beneficiário com validação de CPF e duplicidade (RN-004, RN-007),
coberto por 12 testes" a "Story 42 concluída".]

- [Entrega 1 — com os IDs de negócio entre parênteses]
- [Entrega 2]
- [Entrega 3]

## Decisões tomadas

[Decisões que mudaram o rumo e que o cliente precisa conhecer ou ratificar. Uma linha por
decisão: o que foi decidido, por quê, e o que foi descartado.]

| Decisão | Motivo | Alternativa descartada |
|---|---|---|
| [decisão] | [motivo] | [alternativa] |

## Riscos

[Riscos vivos, não histórico. Para cada um: exposição, probabilidade e o que reduz o risco.
Riscos derivados automaticamente (GAPs abertos, testes falhando, itens bloqueados) já
aparecem no domínio Riscos — aqui entram os que exigem leitura humana.]

## Pendências do cliente

[O que está travado esperando uma decisão, um acesso, um dado ou uma homologação do lado do
cliente. Seja específico sobre o impacto de cada dia de espera.]

## Recomendações

[O que a equipe recomenda, com a justificativa. Separe o que é recomendação técnica do que
é decisão de negócio do cliente.]

## Próximos passos

| Passo | Responsável | Prazo |
|---|---|---|
| [passo] | [quem] | [quando] |
