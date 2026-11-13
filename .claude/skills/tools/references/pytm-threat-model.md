# pytm — threat model executável (passo opcional do spec-legacy §6.4)

> Referência compartilhada. O `spec-legacy` §6.4 aponta para este arquivo — o corpo operacional
> vive aqui para não ser pago em tokens quando o passo (opcional) não é executado.

Dá **enumeração mecânica e reprodutível de ameaças por elemento do modelo** — um checklist
**complementar** à varredura manual do STRIDE, não um substituto. A skill gera um script Python
que **descreve o sistema** (atores, processos, fluxos de dados, data stores, fronteiras de
confiança) a partir do `architecture.md` e deixa a biblioteca cruzar cada elemento com o seu
banco de ameaças.

## Política de ferramenta (verificar → rota efêmera → degradar)

Ver `tool-bootstrap.md` (mesmo diretório). Verificar `python3 -c "import pytm"`; ausente →
**rota efêmera** (não muta o ambiente, dispensa aprovação; registrar `TOOL_EPHEMERAL:pytm (uvx)`):
`uvx --from pytm …` quando o entrypoint permitir, ou `uv run --with pytm python3 …` /
`pipx run --spec pytm …` para executar o `tm.py`. Instalação permanente (`pip install pytm`
**em venv do projeto**) e o Graphviz do SO são **apenas oferecidos** ao usuário e só executados
com aprovação registrada (`TOOL_INSTALLED:pytm (aprovado por <quem>, <comando>)`) — nunca
`pip install --break-system-packages`. Sem rota efêmera e sem aprovação → modo degradado abaixo.

## Comandos

```bash
# pré-requisito do DFD: Graphviz no PATH (`dot -V`). Ausente → oferecer a instalação do SO
# (apt-get install graphviz / brew install graphviz) e só rodar com aprovação; sem ele, seguir
# com o --report (texto) e omitir o DFD.
mkdir -p outputs/spec/signals/pytm
# a skill escreve outputs/spec/signals/pytm/tm.py descrevendo o AS-IS a partir do architecture.md
# ATENÇÃO: --report EXIGE o caminho do template como argumento (--report REPORT); sem ele o argparse aborta.
# Usar o template do próprio pytm (ex.: docs/basic_template.md do repositório) copiado para o projeto.
# `python3` abaixo = interpretador com pytm importável: o do venv, OU o da rota efêmera
# (prefixar `uv run --with pytm ` / `pipx run --spec pytm ` em vez de instalar).
python3 outputs/spec/signals/pytm/tm.py --report outputs/spec/signals/pytm/basic_template.md \
  > outputs/spec/signals/pytm/pytm-report.md
# --dfd emite apenas DOT — renderizar com Graphviz:
python3 outputs/spec/signals/pytm/tm.py --dfd | dot -Tpng -o outputs/spec/signals/pytm/dfd.png
```

## Fluxo

1. A partir do `architecture.md` (componentes, integrações, fronteiras), montar o `tm.py` com
   `Boundary`/`Actor`/`Process`/`Datastore`/`Dataflow`.
2. Rodar para obter o DFD e a lista de ameaças enumeradas.
3. **O modelo analisa e prioriza a saída** — descarta ameaças não aplicáveis ao AS-IS, atribui
   severidade Likelihood×Impact (§6.2 do spec-legacy) e compõe a matriz do `threat-model.md`.

> **O que a pytm entrega de verdade:** o banco de ameaças da pytm é **CAPEC** (identificadores do
> tipo `INP01`, `AC01`, `DO01`…), aplicado mecanicamente elemento por elemento do modelo — **não**
> é uma varredura STRIDE por elemento. Portanto ela **não garante cobertura STRIDE**: serve como
> checklist complementar para expor lacunas da matriz manual (fluxo ou fronteira que ninguém
> analisou), e cada achado CAPEC relevante ainda precisa ser reclassificado em STRIDE + OWASP:2025
> + CWE pela matriz do §6.2.

## Modo degradado (`TOOL_UNAVAILABLE:pytm`)

Se a pytm não estiver importável e a rota efêmera não funcionar (sem `uv`/`pipx`, sem rede) — ou
se a instalação não foi aprovada —, seguir com o **STRIDE manual** (§6.2 do spec-legacy) e
registrar a marca no `sync-log.md`. Nunca é gate FATAL.

## Acelerador opcional para produtos com IA — STRIDE GPT MCP

(https://github.com/mrwadams/mcp-stride-gpt): quando o produto tem IA/agentes, esse MCP pode
acelerar a geração de ameaças STRIDE; tratar sua saída como sugestão a ser triada, não verdade.
