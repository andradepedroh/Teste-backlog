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

## [2026-06-22] revisao | ajustes v1 pós-validação (recuo de IA, 3 conceitos régua/ativa/qualificada, kanban qualificada, aceites/sigilo)
- BCob-01: 3 conceitos separados no protótipo — sidebar já agrupava (Régua de Cobrança · Cobrança Ativa · Cobrança Qualificada); corrigidos data-grupo/data-title das seções (regua-editor/execucao→Régua de Cobrança; fila→Cobrança Ativa · Lista de Ligações; dossie→Cobrança Qualificada · Ciclo).
- BCob-07/07b/19: tela-fila reescrita como Cobrança Ativa massificada para ligações, distribuída entre atendentes; bloco de distribuição automática (planilha atendente×contador); coluna Contato-chave editável (substituiu Score).
- BCob-06/20: tela-dossie ganhou Kanban da cobrança qualificada (Em seleção · Caso selecionado · Dossiê gerado · Condução · Desfecho) com cards de grandes devedores ICMS/ITCD (valores altos), litigioso marcado não-acionável; card abre o dossiê existente abaixo; copy "poucos casos, coordenador sem equipe, deixar respirar"; removido score-pill do header, contato-chave editável.
- BCob-11: tela-integracoes ganhou tabela de parcelamentos inadimplentes (parcelas atrasadas, tempo p/ prescrição) + card planilha atendente×contador.
- BCob-13: tela-carteira com filtro por instrumento + filtro massificada/qualificada; rotulada carteira total; removido "maior score".
- BCob-05/08/09/10/14/15/16: já presentes de passe anterior (critérios selecionáveis com qualificação×segmentação; matriz canais×aceite; disclaimer sigilo fiscal; execução com filtros régua/canal/status; datas de referência D0; editor de etapa em modal; visão coordenador×atendente). Reforçada chip de visão coordenador em regularizacoes; corrigido link de execução p/ dossie.
- Validação HTML: divs 599/599; 12 screens / 12 </section>; tables 17/17; is-future só em tela-score; todos show('tela-*') apontam para id existente; ícones .mi novos resolvem (groups/contact_phone/visibility_off trocados por switch_account/person/privacy_tip).
- A validar com jurídico: matriz canais×aceite e redação dos templates sob sigilo fiscal (chips "a validar com jurídico" no protótipo); regra de edição de régua (nova versão vs. vigente) permanece marcada como a validar.

## [2026-06-22] auditoria-ux | Protótipo v1→v2: a11y + simplificação + segurança de ação
Auditoria UX/UI em 3 ciclos sobre `prototipo/` (NNG + design review, ancorada em `refined/`).
Ciclo 1 a11y (modais com foco/Esc/ARIA, abas por teclado, contraste, skip link, sidebar drawer responsiva).
Ciclo 2 simplificação (12 subtítulos enxutos; banners de ensino contidos).
Ciclo 3 segurança (fundamentação obrigatória em publicação de critérios RNF-T-AUD-02 e registro de interação RNF-T-AUD-01) + verificação de build.
Backlog: `criticas/Backlog_UX_A11y_P2.6_Cobranca.md`. Sem mudança nos .md de `refined/`.

## [2026-06-22] proto-v2 | Protótipo v2: backlog completo (BCob 01–20) + Configurações + densidade
Aplicados os 20 itens do `Backlog_Ajustes_P2.6_Cobranca.md` e os UX/A11y do `Backlog_UX_A11y_P2.6_Cobranca.md`.
IA reorganizada: Cobrança Ativa (fila/ligações) · Cobrança Qualificada (Kanban) · **Configurações** (Critérios, Editor de Régua, Datas & Canais, Score H2). Nova tela `tela-config`. Score recuado p/ H2.
Densidade em todas as 12 telas operacionais (sem narração); nova tela de config = 13 telas. Build OK (prototipo.html). Sem mudança nos .md de `refined/`.

## [2026-06-22] proto-v3 | Reunião com participante do cliente (nome anonimizado): menu enxuto + config + analytics consolidado
Backlog MECE (`Backlog_Ajustes_v3_P2.6_Cobranca.md`) da reunião 22/06 aplicado via 6 agentes paralelos por área.
Menu reduzido a 6 áreas (Carteira · Ativa · Massificada · Qualificada · Analytics · Configurações); dev-nav e ícones de topbar removidos; subtítulos "de slide" eliminados.
Integrações→Configurações (tabela única + modal); Carteira com grão contribuinte×crédito + drawer lateral; Ativa = lista de ligações (telefone, status, interação/follow-up); Réguas = lista→editor (execução embutida); Dossiê = kanban real; Painel = Analytics consolidado (Regularizações+Score+Produtividade, coord×atendente). Revisão de cobertura + reprocesso de pendências. Build OK. Sem mudança nos .md de refined.
