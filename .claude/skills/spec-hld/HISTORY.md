# Histórico — spec-hld

## 1.0 (2026-08-25)

Skill inicial. Fecha o vão entre a `spec-tech-rules` (Fase 5.5, normativa) e a `spec-data-model`
(Fase 6a): as decisões técnicas passavam a valer como regra sem que ninguém desenhasse o sistema
que elas produzem nem conferisse esse sistema contra os requisitos não funcionais.

- **Posição:** Fase 5.6, entre 5.5 e 6a. A `spec-tech-rules` **decide** (kickoff → rules); a
  `spec-hld` **desenha e confere** (rules → containers, integrações, táticas, ADRs). Não há
  kickoff técnico duplicado — as decisões macro das rules viram ADR aqui.
- **Artefato:** `outputs/spec/hld.md` — Markdown com Mermaid embutido (`flowchart` + `subgraph`,
  mesmo estilo do `architecture.md` AS-IS da `spec-legacy`). Descartadas: a sintaxe `C4Context`
  (experimental, renderização instável) e qualquer ferramenta externa (Structurizr, PlantUML) —
  o kit não ganha dependência nova nem renderizador HTML novo.
- **Gramática validável:** `tools/check-hld.py`, no padrão do `check-flowmap.py` — tabelas de
  colunas fixas com IDs (`CON-NN`, `INT-NN`, `FLA-NN`, `TRB-NN`, `ADR-NN`, `RSK-NN`), `--json`
  para consumo por outras skills, exit codes 0/1/2 e degradação declarada no sync-log. Gate em
  prosa auto-avaliado não é gate: os quatro FATAL (`MODULES_MAPPED`,
  `EXTERNAL_SYSTEMS_ADDRESSED`, `NFR_TACTICS_MAPPED`, `CONTAINERS_CONSISTENT`) são checáveis por
  script contra `modules.md`, `context-map.md` e `requirements.md`.
- **Tabelas × diagrama:** o Mermaid é ilustração; os dados canônicos vivem nas tabelas. Todo
  `CON-NN` citado no arquivo — diagrama incluído — tem de existir no inventário, então o desenho
  não pode divergir da tabela em silêncio.
- **Modo compacto:** oferecido no kickoff (uma página: containers + integrações + 3 ADRs). Não
  desliga gate: encolhe prosa e as seções de fluxos, topologia, segurança e riscos, e exige
  `HLD_COMPACT: <motivo>` no sync-log.
- **Entrega visual:** a `spec-estimate-report` ganhou a seção «Arquitetura (HLD)» no topo da aba
  Técnica, desenhada em SVG no cliente a partir de `tecnica.hld` do `report-data.json` (o shell
  não tem CDN — Mermaid não renderiza lá). O bloco é opcional: ausente, a seção some sem quebrar
  o layout.

### Evolução possível (fora do escopo desta versão)

- `spec-report` (kit de discovery em `.md → HTML`) e `spec-status-report` (Fase 12) ainda não
  incorporam o `hld.md`. O `spec-report` já compila os `.md` de `outputs/spec/`, então incluir o
  HLD ali é mudança de lista; o `spec-status-report` precisaria de uma seção de arquitetura na
  rastreabilidade (container → código → teste), o que é trabalho de engine próprio.
- `check-hld.py` poderia cruzar a decomposição com os `boundedContexts` do `data-model.json`
  (contexto sem container, container sem contexto) quando a Fase 6a já tiver rodado — hoje o
  cruzamento é só no sentido inverso, pela leitura humana.
