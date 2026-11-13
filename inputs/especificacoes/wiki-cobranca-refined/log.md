# Log do Wiki

Histórico append-only. Cada entrada: `## [YYYY-MM-DD] <op> | <título>`.
Operações: ingest · query · lint · migration · scaffold.
Consulta rápida: `grep "^## \[" log.md | tail -5`

## [2026-06-15] scaffold+ingest | wiki Cobrança Inteligente criado e preenchido
- Estrutura FLAT criada em refined/ (index, log, overview, blueprint, visao, componentes, 3 transversais, Requisitos/).
- Visão escrita (3 capítulos): 4 personas (Coordenador, Atendente; Contribuinte e UFMT fora do escopo), 7 JTBD, 12 RN + 1 RN-AI (score UFMT), NSM = crédito recuperado atribuível à cobrança (líquido do grupo de controle) + 2 guard-rails.
- Transversais: modelo-dados canônico (12 entidades + erDiagram), requisitos-transversais (RNF-T-SEG/AUD/PERF/DISP/OBS/CONF + RF-T-01..04), telas-comuns (arquétipos A1–A6).
- 6 features (todas eixo=processo) derivadas dos 5 épicos + 3ª oportunidade priorizada: ingestao-carteira, qualificacao-carteira, scoring-liquidez, reguas-cobranca, cobranca-qualificada, monitoramento-kpis.
- Blueprint em 5 etapas de cadeia de valor.
- Fontes: trusted execucao/gestao-projeto (docs Cobran/2.6) + ref-spec-prioridade (Executivo Soluções §2.6, Planning_Poker Produto 6 US1-14).
- Lacunas marcadas (⚠): escopo de coerção, desempate massificada/qualificada, frequência de ciclo, plataforma ServiceNow, janela de atribuição, contrato técnico do score UFMT.

## [2026-06-15] lint+audit | Loop de validação 1 — auditoria e correção da spec
- spec-lint executado: links relativos (0 quebrados), órfãs (0), 3 capítulos por feature (OK nas 6), Mermaid bem-formado (13 blocos + 6 fluxos + erDiagram), IDs RN/RN-AI/JTBD/RF-T/RNF-T resolvem 100%, arquétipo por tela (15/15).
- Correções aplicadas (acionáveis):
  1. telas-comuns A1: referência dangling **T-CQ-04** corrigida para **T-CQ-01** (carga por atendente); T-CQ-01 também adicionada às Instâncias de A3 (declara A3+A1).
  2. blueprint.md ganhou seção `## Relacionado` (estava ausente).
  3. **JTBD-07** (intraciclo → não reabordar) estava órfão de tração: adicionado às §2.1 de ingestao-carteira e cobranca-qualificada.
  4. reguas-cobranca: documentados os **5 segmentos de régua priorizados** (Parcelamentos Inadimplentes, IPVA, ITCD, ICMS Normal, ICMS ST) do Executivo Soluções §2.6 — antes ausentes.
- Navigator regenerado (15 docs, 146 KB).
- Verificação de fatos contra fonte: ~1,8mi contribuintes, 30,9%/22,5% quitação, ~500 grupo de controle, 5,15% retorno réguas, score UFMT a partir de maio/26, "qualificada ≈ ativa", 3 lacunas estratégicas (PGE, coerção, Big Data) — todos confirmados, sem fabricação.
- Pendências que dependem do cliente (não corrigíveis na spec; ⚠ mantidos): escopo de instrumentos coercitivos (sinalizar vs. operar); regra de desempate massificada↔qualificada (RN-04); periodicidade exata do ciclo intraciclo; confirmação da plataforma ServiceNow; janela de atribuição causal (30d assumido) + modelo por canal; contrato técnico/escala do score UFMT (API vs. arquivo) e data efetiva; capacidade máxima por atendente; níveis do dossiê (grupo econômico/situação patrimonial) e fontes.

## [2026-06-16] priorização | passe de priorização Planning Poker P6 + Executivo §2.6
- Backlog canônico filtrado (Produto 6): 14 histórias, todas ID_Projeto 1; 100% no escopo, confirmadas pelo Executivo §2.6 (5 épicos + 5 réguas + habilitadores UFMT/Big Data).
- Cobertura verificada: 6 features mapeiam as 14 histórias (US1/5/12→ingestao; US3/11/14→qualificacao+scoring; US2/4/13→reguas; US6/7→cobranca-qualificada; US8/9/10/11→monitoramento). Nada desescopado; nada faltando.
- Protótipo reordenado para a ordem dos épicos do backlog (Identificação→Qualificação→Massificada→Qualificada→Monitoramento); telas renumeradas 01–12; landing = Integrações; prototipo.html reconstruído.
- Navigator regenerado. PRIORIZACAO.md criado na raiz do produto.

## [2026-06-16] lint | Loop 1/3 escopo — rastreabilidade US1..US14 completada
- Verificação de aderência ao Executivo §2.6 (5 épicos, 12 oportunidades, 5 réguas, 3 habilitadores) e ao backlog Planning Poker (14 histórias, ID_Projeto 1).
- Veredito: aderente. Nada FALTANDO, nada SOBRANDO. 6 features = 5 épicos (Qualificação desdobrada por IA); 12 telas no protótipo (01–12) na ordem dos épicos.
- Correção: adicionadas tags de rastreabilidade US1/US2/US3/US5/US6/US12 nos RFs correspondentes (ingestao-carteira RF-01/03/04/06, qualificacao-carteira RF-01/02, cobranca-qualificada RF-01). Conteúdo já existia; só faltava o tag US explícito. Escopo inalterado.
