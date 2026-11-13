# Requisitos Transversais

> Camada de Requisitos · Requisitos cross-cutting · Spec-Driven Development
> Pergunta-mãe: *Quais requisitos valem para todas (ou quase todas) as features, de modo que não precisem ser repetidos em cada uma?*

Consolida os requisitos não-funcionais e funcionais que se repetem ao longo das features de **Cobrança Inteligente**. Cada feature apenas **referencia** estes IDs no seu Cap. 2 (ex.: "aplica-se `RNF-T-SEG-01`"), reservando o capítulo ao que é genuinamente próprio. IDs estáveis; valores numéricos são parâmetros configuráveis por instância. Marcadores: `*(inferência)*`, `⚠ NÃO IDENTIFICADO`.

---

## RNF transversais

### Segurança

#### RNF-T-SEG-01 — Controle de acesso por perfil
Acesso e visibilidade são governados pelo perfil do usuário (coordenador / atendente, RN-11): o atendente vê apenas a própria carteira/casos e visões não-comparativas; o coordenador vê tudo. Toda tela e dado respeita o field-level access.
*Subsume:* RN-11; visibilidade por perfil presente em Monitoramento e Cobrança Qualificada.

#### RNF-T-SEG-02 — Consentimento e privacidade do contribuinte
Dados de contato e consentimentos (opt-in/opt-out) são tratados conforme a base legal (LGPD); disparos em canais sujeitos a consentimento exigem opt-in vigente (RN-06).
*Subsume:* gestão de opt-in das réguas.

### Auditoria

#### RNF-T-AUD-01 — Trilha imutável de ações
Toda ação relevante (disparo, distribuição, alteração de regra/régua/critério, encerramento de caso, registro de interação, recálculo de score) gera Evento de Auditoria imutável com ator, timestamp, payload e resultado (RN-10).
*Subsume:* requisitos de rastreabilidade em todas as features.

#### RNF-T-AUD-02 — Versionamento de configuração
Critérios de qualificação e modelos de régua são versionados; a versão aplicada a uma carteira/ciclo é registrada e imutável após publicação (RN-03).
*Subsume:* versionamento de regras (Qualificação) e de réguas.

### Performance

#### RNF-T-PERF-01 — Atualização quase-real do ciclo
A consolidação de débitos e a atualização de status de regularização/parcelamento ocorrem em ciclo periódico (diário *(inferência)* ou mais frequente), refletindo no painel e na carteira em tempo quase-real (RN-02). Valores de frequência específicos por feature prevalecem quando declarados.
*Subsume:* atualização intraciclo (Réguas, Monitoramento), monitoramento de parcelamentos.

#### RNF-T-PERF-02 — Processamento em lote de alto volume
Ingestão, qualificação e disparo operam sobre carteira de ~1,8 milhão de contribuintes / múltiplas fontes, em janelas de lote, sem degradar as telas interativas.
*Subsume:* volumetria de Ingestão, Réguas.

### Disponibilidade

#### RNF-T-DISP-01 — Degradação segura por fonte
Falha ou indisponibilidade de uma fonte/integração (CCF, MPI/Big Data, IPVA, ITCD, SNE, canal de mensageria, score UFMT) não derruba o sistema: a feature opera com as fontes disponíveis e sinaliza a lacuna; o score ausente cai no fallback determinístico (RN-AI-01).
*Subsume:* tolerância a falhas de integração em Ingestão, Scoring, Réguas.

### Observabilidade

#### RNF-T-OBS-01 — Status de integração e de entrega rastreáveis
O status de cada integração (última sincronização, registros lidos, erros) e de cada comunicação (enviado/entregue/aberto/falha) é observável e registrado para rastreabilidade.
*Subsume:* rastreabilidade de envio (Réguas), status de sincronização (Ingestão).

### Conformidade

#### RNF-T-CONF-01 — Validação de identificadores
CPF/CNPJ são validados (11/14 dígitos, zero à esquerda) na entrada/vínculo; documentos inválidos não são gravados, evitando cruzamentos e cobranças equivocadas.
*Subsume:* validação cadastral na Ingestão/vínculo.

#### RNF-T-CONF-02 — Continuidade na transição de fonte
A migração MPI→Big Data preserva a operação e a equivalência das regras de elegibilidade, sem ruptura da carteira (RN-12).
*Subsume:* requisito de transição na Ingestão.

---

## RF transversais

#### RF-T-01 — Exportação rastreável
Listas e painéis (carteira, casos, KPIs, comunicações) podem ser exportados (CSV/PDF) respeitando o acesso por perfil, com registro da exportação em trilha de auditoria.
*Subsume:* exportação em Monitoramento, Qualificação, Cobrança Qualificada.

#### RF-T-02 — Busca e filtro padronizados
Toda coleção (carteira, contribuintes, casos, comunicações, réguas) oferece busca e filtros consistentes (por contribuinte/documento, tributo, status, atraso, segmento, atendente).
*Subsume:* filtros recorrentes em todas as listas/filas.

#### RF-T-03 — Consolidação por contribuinte (visão única)
Qualquer feature que exiba dados de um contribuinte usa a visão consolidada (RN-01): débitos, parcelamentos, contatos e histórico, independente da fonte de origem.
*Subsume:* visão única (Ingestão N1.7) reutilizada por Dossiê e telas de contribuinte.

#### RF-T-04 — Marcação de origem da regularização
Quando um débito é regularizado, o sistema registra a origem (espontânea vs. resposta à cobrança, por canal/instrumento) (RN-08).
*Subsume:* marcação de causalidade usada por Réguas e Monitoramento.

---

## Notas de uso

- Cada feature **referencia os IDs acima** no Cap. 2 e lista apenas requisitos **específicos** (thresholds próprios, regras exclusivas, CTs particulares).
- Quando um valor diverge do piso transversal, o valor da feature **prevalece** e fica documentado nela.
- A feature-lar de cada cross-cutting (ex.: Ingestão para visão única RF-T-03; Réguas para marcação de origem RF-T-04) trata parte destes transversais como requisito **próprio**.

## Relacionado
- [Índice do wiki](index.md)
- [Visão do produto](visao.md)
- [Modelo de dados (transversal)](modelo-dados.md)
- [Telas comuns (arquétipos)](telas-comuns.md)
