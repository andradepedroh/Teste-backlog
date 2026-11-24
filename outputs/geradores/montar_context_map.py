"""Monta outputs/spec/context-map.md a partir de cm_fontes.md. Uso: python3 -I montar_context_map.py <scratch> <saida>"""
import re
import sys
from collections import OrderedDict
from pathlib import Path

S = Path(sys.argv[1])
fontes = (S / "cm_fontes.md").read_text(encoding="utf-8")

dom = OrderedDict()
for m in re.finditer(r"^\| (F-\d{3}) \| .*? \| .*? \| (.*?) \| (alta|média|baixa) \|$", fontes, re.M):
    dom.setdefault(m.group(2), []).append(m.group(1))


def faixa(lista):
    nums = sorted(int(x[2:]) for x in lista)
    partes, ini, ant = [], nums[0], nums[0]
    for v in nums[1:] + [None]:
        if v is not None and v == ant + 1:
            ant = v
            continue
        partes.append(f"F-{ini:03d}" if ini == ant else f"F-{ini:03d} a F-{ant:03d}")
        if v is not None:
            ini = ant = v
    return ", ".join(partes)


lacunas = {
    "Ingestão e Carteira Consolidada": "Contrato definitivo de campos por fonte; janela do ciclo diário",
    "Qualificação e Parametrização da Carteira": "Tamanho do grupo de controle (3% × ~500); desempate entre segmentos; fonte de contumazes",
    "Scoring de Liquidez": "Score na v1 ou no H2; contrato com a UFMT",
    "Réguas de Cobrança Massificada": "Provedor e contratação do WhatsApp; validação jurídica dos modelos; edição de régua em uso",
    "Cobrança Qualificada": "Regra de distribuição (carga/grupo × contador); esteira de estágios do protótipo",
    "Monitoramento e KPIs": "Licença do Platform Analytics; atribuição com mais de um canal",
    "Governança, Acesso e Auditoria": "Matriz de acesso a validar",
}
linhas_dom = []
for d, fs in dom.items():
    linhas_dom.append(f"| {d} | {faixa(fs)} | {lacunas.get(d, '—')} |")

cab = """# Mapa de contexto — ingestão micro

Status: draft
Última atualização: 2026-11-13
Fontes: outputs/explore/hld-funcional.md, outputs/explore/especificacao-funcional.md, outputs/explore/especificacao-tecnica.md, outputs/explore/modelo-de-dados.md, outputs/explore/gaps.md, inputs/especificacoes/etf-cobranca-inteligente.pdf, inputs/especificacoes/wiki-cobranca-refined/ (15 arquivos), inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx, inputs/prototipo/prototipo-cobranca-v3.html

**Instrução:** não apagar seções; preencher ou declarar *não aplicável* / *ausente na fonte*.

> Kickoff (do `sync-log.md`): sem legado, ramo A (documentação primeiro), ambiente claude. Simulação
> do fluxo do harness até o backlog, sem horas; decisor Pedro. Os fatos vindos de `outputs/explore/`
> usam a âncora `<arquivo> §<seção> <ID>`, com o ID do Explore literal.

<!-- id: context-overview -->

## Resumo executivo *(síntese — não substitui as tabelas abaixo)*

- Projeto / produto (nome provisório): Cobrança Inteligente — produto 2.6 Cobrança da SEFAZ-MT (Profisco II), em ServiceNow
- Objeto do trabalho (uma frase): consolidar os débitos tributários de várias fontes numa visão única por contribuinte, qualificar a carteira, cobrar por réguas automáticas e por atendentes, e medir o efeito da cobrança contra um grupo de controle (F-001 a F-007, F-187)

---

<!-- id: source-files -->

## Inventário de arquivos em `inputs/`

| # | Caminho | Tipo | Tamanho / data | Lido na íntegra? |
|---|---------|------|----------------|------------------|
| 1 | inputs/especificacoes/etf-cobranca-inteligente.pdf | doc (especificação técnica e funcional) | 28 páginas · 1,2 MB · recebido 2026-11-13 | sim |
| 2 | inputs/especificacoes/wiki-cobranca-refined/ (visão, blueprint, 6 requisitos, modelo de dados, transversais, telas, componentes, índice, overview, log) | doc (wiki TO-BE em Markdown) | 15 arquivos · ~115 KB · atualizado 2026-06-22 | sim |
| 3 | inputs/especificacoes/wiki-cobranca-refined-navegador.html | doc (navegador da mesma wiki) | 150 KB | parcial — mesmo conteúdo do item 2, lido pela versão Markdown |
| 4 | inputs/especificacoes/LEIAME.md | doc (índice dos insumos) | 1 KB | sim — só organização, sem fatos de negócio |
| 5 | inputs/briefing/plano-de-implementacao-2.6-cobranca-v3.pptx | doc (apresentação) | 23 slides (7 ocultos) · setembro de 2026 | sim — inclusive os slides ocultos; nomes de pessoas anonimizados |
| 6 | inputs/prototipo/prototipo-cobranca-v3.html | protótipo de validação (HTML único, 13 telas, dados fictícios) | 335 KB | parcial — usado só para intenção de produto (política de protótipo) |
| 7 | inputs/prototipo/LEIAME.md | doc (índice do protótipo) | 1 KB | sim |
| 8 | outputs/explore/ (5 documentos do pré-projeto) | doc (pré-projeto do Explore) | versão 0.1 · 2026-11-13 | sim — fonte principal dos RF e RN |

---

<!-- id: atomic-by-source -->

## Extração atômica **por fonte**

> Os documentos do Explore foram escritos a partir da ETF, da wiki e do plano. Quando o mesmo fato
> está no Explore e numa fonte original, a linha do Explore carrega o ID (para o rastreio do Plan) e a
> fonte original aparece nas tabelas consolidadas. `outputs/explore/modelo-de-dados.md` e
> `outputs/explore/gaps.md` não geram fatos novos: o primeiro resume a ETF §4 (ver F-146 a F-157) e o
> segundo é a lista de questões, refletida em «Questões em aberto».

"""

numeros = """
<!-- id: numbers-dates -->

## Números, datas, volumes, SLAs citados *(não perder)*

| Valor | Contexto | Fonte (ID F-xxx ou arquivo) |
|-------|----------|------------------------------|
| ~1,8 milhão | contribuintes na base consolidada | F-183, F-132 |
| ~1,4 milhão de linhas | tamanho do lote de score no exemplo | F-149 |
| ~22 mil por dia | comunicações que a camada de envio precisa suportar | F-150 |
| centenas de milhares por ciclo | disparo em lote previsto pela wiki | F-199 |
| 3% | percentual padrão do grupo de controle sobre a carteira segmentada | F-151 |
| ~500 por ciclo | exemplo de tamanho do grupo de controle na wiki | F-186 |
| 30 dias | janela padrão de atribuição da regularização e de «paga em até 30 dias» | F-152, F-185 |
| 30,9% e 22,5% | histórico de quitação do ICMS Normal e do ICMS ST | F-184 |
| 5,15% | taxa de retorno de réguas de referência | F-185 |
| 26 | tabelas customizadas no escopo x_cbi_ | F-146 |
| 7 | APIs de ingestão (6 fontes de débito + score) | F-139 |
| 19 (5 prontas, 2 parciais, 9 a desenvolver, 3 sem resposta) | APIs de que o produto depende, base 30/09 | F-176 |
| 5 | papéis de acesso | F-017, F-158 |
| 12 → 2 + 10 | telas do protótipo: 2 viram dashboards, 10 viram visões nativas | F-137 |
| 408 h · 12,55 semanas · 6,5 h/dia | estimativa da ETF para um desenvolvedor sênior | F-143, F-144 |
| 13 semanas | cronograma sugerido da ETF | F-145 |
| dezembro de 2026 a abril de 2027 | cronograma do plano, até treinamento e operação assistida | F-170 |
| 11 meses · 7 meses | diagnóstico e redesenho; Etapa 4 de implementação e capacitação | F-164 |
| maio de 2026 | início do uso dos dados de cobrança no modelo de score | F-197 |
| setembro de 2026 | data do plano de implementação | F-163 |
| CQ-AAAA-NNNN · PAR-AAAA-NNNNN | formatos de número do caso e do parcelamento | F-153 |

---

<!-- id: contradictions -->

## Contradições entre fontes

| Tema | Fonte A (ref) | Fonte B (ref) | Como resolver depois |
|------|---------------|----------------|----------------------|
| Score na v1 ou no segundo horizonte | ETF e plano põem o score na v1, como F3 (F-139, F-169, F-067 a F-071) | wiki e protótipo tratam o score como H2, dependente do modelo da UFMT (F-197, INF-003) | Questão 1 — decisão de escopo no `spec-product` |
| Tamanho do grupo de controle | 3% da carteira segmentada (F-151, F-063) | cerca de 500 por ciclo (F-186) | Questão 2 — pode ser compatível (depende do tamanho da carteira); confirmar o parâmetro |
| Regra de distribuição de casos | ETF: por carga ou por grupo de atendentes (F-087, F-093) | wiki: vínculo contador ↔ atendente, balanceamento e prioridade (F-198) | Questão 3 (GAP-009) |
| Cobrança Ativa por telefone | ETF não tem a tela; a fila do atendente é a «Minha Fila» da qualificada (F-137, F-025) | protótipo v3 cria a «Cobrança Ativa — Lista de Ligações» (INF-001) | Questão 4 (GAP-005) |
| Cronograma e equipe | ETF: um desenvolvedor sênior, 13 semanas (F-143, F-145) | plano: squad de dezembro de 2026 a abril de 2027 (F-170) | Questão 7 (GAP-006) — fora do backlog nesta simulação |
| Fonte da lista de contumazes | Explore e ETF: exclusão de contumazes como critério da carteira, alimentado pelas fontes (F-055) | TI: o controle está no sistema Credep (F-178) | Questão 5 (GAP-017) |

---

<!-- id: domain-candidates -->

## Domínios de negócio *(candidatos)*

| Domínio (nome de negócio) | IDs de fatos que sustentam | Lacunas |
|---------------------------|-------------------------------|---------|
"""

sistemas = """
---

<!-- id: systems-integrations -->

## Sistemas, integrações, contratos mencionados

| Nome | Papel | Protocolo / dado | Fonte (F-xxx) |
|------|-------|------------------|---------------|
| ServiceNow (App Engine, Platform Analytics) | plataforma do produto | aplicação escopada x_cbi_; listas e formulários nativos; dashboards | F-008, F-135, F-138, F-165 |
| Conta Corrente Fiscal (CCF) | fonte de débitos de ICMS e parcelamentos | Scripted REST API, lote incremental por data de alteração | F-117, F-139, F-180 |
| MPI | fonte de elegíveis de ICMS, em descontinuação | Scripted REST API; percentual de migração | F-118, F-161, F-177 |
| Big Data (P2.2) | destino das regras de elegibilidade do MPI | Scripted REST API | F-119, F-177 |
| Sistema IPVA | fonte de débitos de IPVA e opt-in | Scripted REST API | F-120, F-162 |
| GIA-ITCD | fonte de débitos e declarações de ITCD | Scripted REST API | F-121 |
| SNE / DT-e | fonte de débitos e sinalizações coercitivas | Scripted REST API | F-122, F-157 |
| UFMT (modelo de score) | fornece o score de liquidez | Scripted REST API por lote, com versão do modelo | F-123, F-149, F-177 |
| Provedor de e-mail, SMS e WhatsApp | envio das comunicações e status de entrega | REST Message de saída; callback por Scripted REST API | F-124, F-125, F-141, F-179 |
| B-Cadastro e Cadastro de Contadores | dados cadastrais e vínculo contador–contribuinte | APIs prontas, uso não previsto na ETF | F-126, F-180 |
| Credep | controle de contribuintes contumazes | não definido | F-178 |
| SSO da SEFAZ-MT | login dos servidores | autenticação da instância | F-142, F-180 |
| Planilhas e Google Drive | distribuição atual da carteira (processo a substituir) | manual | F-190 |
| SUCOM | consultado pelo atendente para montar o histórico (processo atual) | manual | F-194 |

---

<!-- id: module-capacity-candidates -->

## Candidatos a módulo / capacidade *(opcional — alimenta spec-product Passo 3.0)*

| Rótulo provisório | Fatos (F-xxx) | Colisão com domínio candidato (Passo 5)? | Nota para spec-product 3.0 |
|-------------------|----------------|-------------------------------------------|-----------------------------|
| MOD-INGESTAO — Ingestão e Carteira Consolidada | F-001, F-032 a F-054 | não — mesmo nome | ETF F1 · épico 1 |
| MOD-QUALIFICACAO — Qualificação e Parametrização da Carteira | F-002, F-055 a F-066 | não | ETF F2 · épico 2 |
| MOD-SCORE — Scoring de Liquidez | F-003, F-067 a F-071 | não | ETF F3 · épico 2; decidir v1 × H2 (Questão 1) |
| MOD-REGUAS — Réguas de Cobrança Massificada | F-004, F-072 a F-085 | não | ETF F4 · épico 3 |
| MOD-QUALIFICADA — Cobrança Qualificada | F-005, F-086 a F-095 | não | ETF F5 · épico 4; avaliar a Cobrança Ativa (Questão 4) |
| MOD-MONITORAMENTO — Monitoramento e KPIs | F-006, F-096 a F-107 | não | ETF F6 · épico 5 |
| MOD-GOVERNANCA — Governança, Acesso e Auditoria | F-007, F-108 a F-116 | não | transversal do plano (papéis, mascaramento, auditoria) |

---

<!-- id: actors -->

## Atores e papéis

| Ator / papel | Responsabilidade citada | Frequência de uso | Fonte (F-xxx) |
|---------------|-------------------------|-------------------|----------------|
| Coordenador de Cobrança (CPRF) | define critérios, confirma carteira, gerencia réguas, reatribui casos, vê indicadores; dono do produto na homologação | diária | F-010, F-172 |
| Atendente de Cobrança | trabalha os próprios casos, registra interações; usuário-chave na homologação | diária | F-011, F-173 |
| Gestor de Integração | acompanha lotes, reprocessa rejeitados, acompanha o score | diária | F-012 |
| Auditor | lê versões, auditoria e histórico | eventual | F-013 |
| Administrador da aplicação | administra parâmetros, faixas e metas | eventual | F-014 |
| Sistemas parceiros (usuário de integração por fonte) | enviam lotes pela própria API | diária (por lote) | F-015, F-139 |
| Contribuinte | recebe comunicações; não usa o sistema | — | F-016 |
| UFMT | desenvolve o modelo de score (fora do produto) | por lote | F-123, F-200 |
| TI SEFAZ-MT | responde pelas integrações e disponibiliza acessos e ambientes | projeto | F-166, F-175 |
| SQUAD Cobrança | constrói, mantém o ambiente e corrige defeitos | projeto | F-170, F-174 |
| EloGroup (consultoria) | monta o roteiro e conduz a homologação | projeto | F-174 |

---

<!-- id: pains-metrics -->

## Dores e métricas *(com rasto)*

| Dor ou métrica | Impacto citado | Fonte |
|----------------|-----------------|-------|
| Seleção da carteira empírica | não auditável nem replicável | F-189 |
| Distribuição por planilha e Google Drive | trabalho manual, carga desequilibrada | F-190 |
| Sem visão gerencial em tempo real | indicadores dependem de extração manual | F-191 |
| Disparo com confirmação manual em lote | sem régua estruturada | F-192 |
| Grupo de controle por sorteio manual | não se mede o efeito incremental | F-193 |
| Consulta a vários sistemas antes do contato | atendimento lento e sem contexto | F-194 |
| Status por foto mensal | risco de cobrar quem já regularizou | F-195 |
| Histórico disperso | contatos sem registro por caso | F-196 |
| Crédito recuperado atribuível à cobrança | métrica principal, líquida do grupo de controle | F-187 |
| Regularização espontânea do controle e opt-out por canal | métricas de proteção | F-188 |
| Quitação ICMS Normal ~30,9% e ICMS ST ~22,5% | referência histórica | F-184 |
| Retorno de réguas ~5,15% | referência | F-185 |

---

<!-- id: open-questions -->

## Questões em aberto *(potenciais GAPs — só depois de esgotar fontes; sem criar IDs GAP-XXX aqui)*

| # | Pergunta | Evidência/contexto (F-xxx ou arquivo:linha) | Bloqueia próxima fase? |
|---|----------|-----------------------------------------------|--------------------------|
| 1 | O score de liquidez entra na v1 ou fica para o segundo horizonte? | F-197, F-169, INF-003 | não — o `spec-product` pode tratá-lo com fallback; decide o escopo do MOD-SCORE |
| 2 | O grupo de controle é 3% da carteira ou um número fixo (~500) por ciclo? | F-151, F-186 | não |
| 3 | A distribuição de casos usa vínculo contador ↔ atendente ou só carga e grupo? (gaps.md GAP-009) | F-087, F-093, F-198 | não |
| 4 | A Cobrança Ativa por telefone do protótipo entra na v1? (GAP-005) | INF-001, F-137 | não — muda o tamanho do MOD-QUALIFICADA |
| 5 | De onde vem a lista de contumazes: CCF ou Credep? (GAP-017) | F-178 | não |
| 6 | O Platform Analytics está licenciado? (GAP-002) | F-138, F-131 | não para o backlog; sim para construir os painéis |
| 7 | Cronograma e equipe: um desenvolvedor por 13 semanas ou squad até abril de 2027? (GAP-006) | F-143, F-170 | não nesta simulação (sem horas) |
| 8 | Contrato de campos de cada fonte e respostas da TI sobre MPI, Big Data e UFMT (GAP-001) | F-140, F-177 | não para o backlog; sim para integrar de verdade |
| 9 | Provedor de mensagens, contratação do WhatsApp e validação jurídica dos modelos sob sigilo fiscal (GAP-004, GAP-015) | F-141, F-179 | não para o backlog |
| 10 | O contato-chave editável do protótipo entra no modelo, com base legal para dado pessoal? | INF-004 | não |
| 11 | A matriz de acesso proposta está aprovada? (GAP-003) | F-158 | não |
"""

doc = cab + fontes + numeros + "\n".join(linhas_dom) + "\n" + sistemas
Path(sys.argv[2]).write_text(doc, encoding="utf-8")
print("domínios:", len(dom), "| linhas:", doc.count("\n"))
