"""Gera modules.md, business-rules.md, requirements.md, product-requirements.md e flow-map.md.
Uso: python3 -I sp_gerar.py <scratch> <repo>"""
import sys
from pathlib import Path

S, REPO = Path(sys.argv[1]), Path(sys.argv[2])
sys.path.insert(0, str(S))
import sp_dados as D  # noqa: E402
import sp_telas as T  # noqa: E402

OUT = REPO / "outputs" / "spec"
HOJE = "2026-11-13"

# ---------- índices
FMAP = {}
for linha in (S / "cm_index.tsv").read_text(encoding="utf-8").splitlines():
    k, _, v = linha.partition("\t")
    if k.startswith(("RF-", "RN-", "MOD-")):
        FMAP[k] = v
MOD = {m[0]: m for m in D.MODULOS}
ABREV = {m[0]: m[6] for m in D.MODULOS}

# Explore RF → módulo (pela ordem da especificação funcional)
FAIXAS = [("MOD-INGESTAO", 1, 15), ("MOD-QUALIFICACAO", 16, 21), ("MOD-SCORE", 22, 25), ("MOD-REGUAS", 26, 34),
          ("MOD-QUALIFICADA", 35, 41), ("MOD-MONITORAMENTO", 42, 49), ("MOD-GOVERNANCA", 50, 55)]
RF_NOVO, RF_MOD = {}, {}
RASTRO = {}
for mod, a, b in FAIXAS:
    for i, n in enumerate(range(a, b + 1), 1):
        RF_NOVO[f"RF-{n:03d}"] = f"RF-{mod}-{i:02d}"
        RF_MOD[f"RF-{n:03d}"] = mod
        RASTRO[f"RF-{n:03d}"] = FMAP[f"RF-{n:03d}"] + (f", {FMAP[mod]}" if i == 1 else "")

import re as _re
for _m in _re.finditer(r"^\| (F-\d{3}) \| [^|]*\| especificacao-funcional\.md §2 (RF-\d{3}) \|", (REPO / "outputs/spec/context-map.md").read_text(encoding="utf-8"), _re.M):
    RASTRO[_m.group(2)] += f", {_m.group(1)}"

# RN explore → RN-NOVO
RN_NOVO, cont = {}, {}
regras = []
for r in D.RNS:
    ab = ABREV[r[1]]
    cont[ab] = cont.get(ab, 0) + 1
    nid = f"RN-NOVO-{ab}-{cont[ab]:03d}"
    RN_NOVO[r[0]] = nid
    regras.append((nid, r[0], FMAP[r[0]]) + r[1:])
for r in D.RNS_EXTRA:
    ab = ABREV[r[1]]
    cont[ab] = cont.get(ab, 0) + 1
    nid = f"RN-NOVO-{ab}-{cont[ab]:03d}"
    RN_NOVO["X-" + r[0]] = nid
    regras.append((nid, None, FMAP[r[0]]) + r[1:])

rfs_por_rn = {}
for rf in D.RFS:
    for rn in rf[11]:
        rfs_por_rn.setdefault(RN_NOVO[rn], []).append(RF_NOVO[rf[0]])
rfs_por_rn.setdefault(RN_NOVO["X-RF-023"], []).append(RF_NOVO["RF-023"])
rfs_por_rn.setdefault(RN_NOVO["X-RF-045"], []).append(RF_NOVO["RF-045"])

# ---------- modules.md
m = [f"""# Registro Canônico de Módulos — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: {HOJE}
Fonte de verdade para todos os documentos. Códigos `MOD-XXX` usados em `requirements.md`, `business-rules.md`, `product-requirements.md`, `prototype.md` e `gaps.md` devem corresponder a uma linha desta tabela.

<!-- id: modules-registry -->

## Catálogo

| Código | Nome canônico (linguagem do cliente) | Aliases aceitos | Atores primários | Objetivo de negócio (1 frase) | Limites (o que NÃO faz) | Status |
|--------|--------------------------------------|-----------------|------------------|-------------------------------|-------------------------|--------|"""]
for c, nome, al, at, obj, lim, _ in D.MODULOS:
    m.append(f"| {c} | {nome} | {al} | {at} | {obj} | {lim} | ativo |")
m.append(f"""
**Convenções:**
- **Código:** prefixo `MOD-` + abreviação curta. Os 7 códigos vêm do `hld-funcional.md` do Explore, sem renomeação.
- **Aliases:** a coluna traz os rótulos F1 a F6 do plano de implementação e os nomes de tela do protótipo.
- **Status:** todos `ativo` na v1. A Cobrança Ativa por telefone (protótipo v3) não virou módulo: ficou fora da v1 por decisão de Pedro em {HOJE}.

---

## Regras de uso

1. **Toda referência a módulo** em qualquer documento usa o código canônico desta tabela.
2. **Adição de módulo** só após `spec-product` Passo 3.0 ser revisado — não criar módulos durante geração de RF.
3. **Renomeação** registra alias antigo na coluna Aliases (rastreabilidade de menções já feitas).
4. **Validação automática:** `python3 ../tools/check-modules.py` reporta divergências entre este registro e os documentos.

---

## Histórico de mudanças no catálogo

| Data | Mudança | Motivo |
|------|---------|--------|
| {HOJE} | Versão inicial, com os 7 módulos do Explore | Passo 3.0 de spec-product; lista confirmada por Pedro (`modulos-kickoff` no sync-log) |
""")
(OUT / "modules.md").write_text("\n".join(m), encoding="utf-8")

# ---------- business-rules.md
b = [f"""# Regras de Negócio — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: {HOJE}
Total de RN: 0 legado · {len(regras)} novo produto
Fonte: context-map.md (F-xxx, inclusive as regras RN-nnn do Explore ancoradas em `especificacao-funcional.md §3`), discovery-document.md, ETF

> **Seção A — Regras do Legado:** omitida. O projeto não tem legado (`legacy.md` em modo skip).

---

## Seção B — Regras do Novo Produto

Cada regra abaixo promove uma regra preliminar do Explore (`RN-nnn`, citada na linha **Origem**) ou
uma regra de cálculo que a ETF detalha. O tipo segue a classificação de regras de negócio (Fato,
Restrição, Derivação, Inferência ou Gatilho); toda regra de Derivação traz o algoritmo em passos.

<!-- id: br-new -->
"""]
for mod in MOD:
    b.append(f"\n### Domínio: {MOD[mod][1]}\n")
    for (nid, rn_exp, fid, md, tit, tipo, enun, alg, exc, conf, just) in [x for x in regras if x[3] == mod]:
        origem = f"{fid} — regra {rn_exp} do Explore (`especificacao-funcional.md §3 {mod} {rn_exp}`)" if rn_exp else f"{fid} — ETF §2.1 e §6, detalhamento da regra de cálculo"
        b.append(f"#### {nid}: {tit}\n")
        b.append("| Campo | Conteúdo |\n|-------|----------|")
        b.append(f"| **Módulo** | {md} |")
        b.append(f"| **Origem** | {origem} |")
        b.append(f"| **Domínio** | {MOD[md][1]} |")
        b.append(f"| **Tipo** | {tipo} |")
        b.append(f"| **Enunciado** | {enun} |")
        b.append(f"| **Algoritmo** | {' '.join(f'{i}. {p}.' for i, p in enumerate(alg, 1)) if alg else '— (não é Derivação)'} |")
        b.append(f"| **Exceções** | {exc} |")
        if nid == RN_NOVO["RN-006"]:
            conf = "⚠️ BLOQUEADO por GAP-028: só o IPVA tem fonte de opt-in; para ICMS, ITCD e parcelamentos nenhuma comunicação sai até a fonte ser definida (decisão de Pedro, 2026-11-13)"
        b.append(f"| **Conflitos** | {conf} |")
        b.append(f"| **Vinculada a** | {', '.join(sorted(set(rfs_por_rn.get(nid, [])))) or '—'} |")
        b.append(f"| **Justificativa** | {just} |\n\n---\n")
b.append(f"""
<!-- id: br-conflicts -->

## Tabela de conflitos cruzados

| RN A | RN B | Tema do conflito | Resolução |
|------|------|------------------|-----------|
| {RN_NOVO['RN-004']} | {RN_NOVO['RN-019']} | Contribuinte que atende aos critérios dos dois segmentos | QA-01 |
| {RN_NOVO['RN-026']} | {RN_NOVO['RN-005']} | Contato por mais de um canal na janela de atribuição: qual canal recebe o crédito | QA-02 (provisório: o contato mais recente) |
| {RN_NOVO['RN-019']} | {RN_NOVO['RN-018']} | Exclusão de contumazes depende de dado que a TI diz estar no Credep, fora das seis fontes | QA-03 |

---

<!-- id: br-open-questions -->

## Questões em aberto

| QA | RNs envolvidas | Descrição | Sugestão de tratamento |
|----|-----------------|------------|-------------------------|
| QA-01 | {RN_NOVO['RN-004']}, {RN_NOVO['RN-019']} | Regra de desempate entre massificada e qualificada (gaps.md GAP-007) | Coordenação decide; provisório: vale o segmento qualificado quando o valor passa do limite da qualificada |
| QA-02 | {RN_NOVO['RN-026']} | Modelo de atribuição com mais de um canal na janela (GAP-008) | Validar com a Coordenação; provisório: contato mais recente |
| QA-03 | {RN_NOVO['RN-019']} | Fonte da lista de contumazes: CCF ou Credep (GAP-017) | TI confirma; até lá a exclusão de contumazes usa o indicador recebido da CCF |
""")
(OUT / "business-rules.md").write_text("\n".join(b), encoding="utf-8")

# ---------- requirements.md
RNFS = D_RNF = [
    ("RNF-DES-001", "Consolidação dentro da janela do ciclo", "Desempenho", "Must", "MOD-INGESTAO",
     "A base de cerca de 1,8 milhão de contribuintes precisa estar consolidada antes do início do trabalho do dia.",
     ["Sistemas parceiros", "fechamento do ciclo diário com as seis fontes", "operação normal, volume de cerca de 1,8 milhão de contribuintes", "consolidação por contribuinte e posição por tributo", "posição atualizada de todos os contribuintes com débito recebido", "≤ 4 horas entre o último horário-limite das fontes e o fim da consolidação"],
     "Tempo de consolidação do ciclo", "≤ 4 horas", "carga diária completa das seis fontes", "Em 5 ciclos consecutivos com lotes simulados de volume real, a consolidação termina em até 4 horas", "Teste com o kit de lotes simulados", "F-183, F-133", "RF-MOD-INGESTAO-03, QA-02"),
    ("RNF-DES-002", "Envio diário das comunicações", "Desempenho", "Must", "MOD-REGUAS",
     "As comunicações devidas no dia precisam sair no mesmo dia, para a cadência da régua valer.",
     ["Processamento diário das réguas", "cerca de 22 mil comunicações devidas no dia", "operação normal, provedores disponíveis", "camada de envio por canal", "todas as comunicações devidas enviadas ao provedor", "100% das comunicações devidas entregues ao provedor em até 6 horas do início do processamento"],
     "Comunicações devidas enviadas no dia", "100% em até 6 horas", "22 mil comunicações por dia", "Em teste com 22 mil comunicações simuladas, todas chegam ao provedor em até 6 horas", "Teste de volume", "F-150", "RF-MOD-REGUAS-02, RF-MOD-REGUAS-05"),
    ("RNF-CONF-001", "Fonte em falha não interrompe o ciclo", "Confiabilidade", "Must", "MOD-INGESTAO",
     "Uma fonte fora do ar não pode impedir a consolidação das demais.",
     ["Uma fonte de débitos", "não entrega o lote até o horário-limite", "ciclo diário em andamento", "fechamento do ciclo", "as demais fontes são consolidadas e a fonte com falha mantém a última carga válida", "100% das fontes que entregaram consolidadas no ciclo, com alerta em até 15 minutos após o horário-limite"],
     "Fontes consolidadas com uma em falha", "100% das que entregaram; alerta ≤ 15 min", "simulação de falha de uma fonte", "Em teste com uma fonte sem entrega, as outras cinco são consolidadas e o alerta chega em até 15 minutos", "Teste de falha simulada", "F-133", "RF-MOD-INGESTAO-05, RF-MOD-INGESTAO-06"),
    ("RNF-SEG-001", "Acesso restrito ao papel", "Segurança", "Must", "MOD-GOVERNANCA",
     "Cada papel vê e altera só o que a matriz de acesso permite.",
     ["Usuário de qualquer um dos 5 papéis", "tenta ler ou alterar dado fora da sua permissão, inclusive pelo endereço direto do registro", "operação normal", "dados da aplicação", "o acesso é negado", "0 acessos indevidos em teste com os 5 papéis sobre todos os grupos de tabelas"],
     "Acessos indevidos em teste", "0", "roteiro de teste por papel × grupo de tabelas", "O roteiro de teste por papel não encontra nenhum acesso fora da matriz", "Teste de permissões por papel", "F-017, F-158", "RF-MOD-GOVERNANCA-01, RF-MOD-GOVERNANCA-02"),
    ("RNF-SEG-002", "Opt-out respeitado na hora", "Segurança", "Must", "MOD-REGUAS",
     "Quem retira o consentimento não recebe mais mensagem naquele canal.",
     ["Contribuinte", "registra opt-out em um canal", "régua ativa com etapa devida no mesmo dia", "verificação de consentimento", "nenhuma comunicação é enviada no canal após o registro", "0 comunicações enviadas no canal após o opt-out"],
     "Envios após opt-out", "0", "teste com opt-out registrado antes do processamento", "Nenhuma comunicação sai no canal depois do opt-out", "Teste de régua com opt-out", "F-188", "RF-MOD-REGUAS-04"),
    ("RNF-USA-001", "Acessibilidade das telas nativas", "Usabilidade", "Should", "MOD-GOVERNANCA",
     "As telas e os painéis seguem o nível AA de acessibilidade, em português do Brasil.",
     ["Usuário interno", "usa listas, formulários e painéis", "navegador corporativo", "telas nativas e dashboards", "todas as telas em português do Brasil, navegáveis por teclado", "0 erros críticos de acessibilidade na verificação automática das 14 telas"],
     "Erros críticos de acessibilidade", "0", "verificação automática nas 14 telas", "A verificação automática não aponta erro crítico em nenhuma tela", "Verificação automática de acessibilidade", "F-008", "RF-MOD-MONITORAMENTO-07"),
    ("RNF-CONF-002", "Painéis atualizados a cada dia", "Confiabilidade", "Should", "MOD-MONITORAMENTO",
     "Os indicadores do dia anterior precisam estar disponíveis no início do expediente.",
     ["Coleta agendada dos indicadores", "fechamento do ciclo do dia anterior", "operação normal", "Painel Institucional e Painel do Score", "indicadores atualizados com os dados do ciclo anterior", "coleta concluída até 08:00 em 95% dos dias úteis do mês"],
     "Dias com coleta concluída até 08:00", "≥ 95%", "dias úteis do mês", "Em um mês de operação assistida, a coleta termina até 08:00 em pelo menos 95% dos dias úteis", "Acompanhamento da coleta", "F-147", "RF-MOD-MONITORAMENTO-07, RF-MOD-SCORE-04"),
]

BLOQ = {r: " ⚠️ BLOQUEADO por GAP-028 para os segmentos ICMS Normal, ICMS ST, ITCD e Parcelamentos: não há fonte de opt-in fora do IPVA (decisão de Pedro, 2026-11-13, manter a regra e bloquear)." for r in ("RF-027", "RF-029", "RF-030")}

def cen(s):
    nome, dado, quando, entao = [x.strip() for x in s.split("|")]
    return f"  {dado}\n  {quando}\n  {entao}", nome

r = [f"""# Requisitos Funcionais e Não Funcionais (negócio) — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

Status: draft
Última atualização: {HOJE}
Versão: 1.0
Escopo: comportamento observável (RF) e qualidades exigíveis pelo negócio (RNF de negócio).
Fonte: context-map.md (F-xxx), discovery-document.md §4, product-vision.md, business-rules.md, ETF e plano de implementação v3 em `inputs/`.

> **Nota de escopo:** RNF técnicos profundos ficam para a fase técnica. Aqui ficam os RNF que o
> **negócio** decide. Cada RF promove um RF preliminar do Explore (`RF-nnn`, citado nas Notas); o
> fato de origem (F-xxx) ancora o RF do Explore em `especificacao-funcional.md §3`.
> Decisões de escopo de Pedro em {HOJE}: score na v1 com fallback; grupo de controle de 3%;
> distribuição por carga ou grupo; Cobrança Ativa por telefone fora da v1.

<!-- spec-check-modular: on -->

<!-- id: reqfun-modules -->

## Índice de módulos e cobertura

| Módulo | Objetivo de negócio | Nº RF planejado | Nº RF escritos | Lacunas (QA) |
|--------|---------------------|-----------------|----------------|---------------|"""]
for mod, a, bb in FAIXAS:
    n = bb - a + 1
    lac = {"MOD-QUALIFICACAO": "QA-01, QA-04", "MOD-MONITORAMENTO": "QA-03", "MOD-INGESTAO": "QA-02"}.get(mod, "—")
    r.append(f"| {mod} | {MOD[mod][4]} | {n} | {n} | {lac} |")

r.append("""
<!-- id: reqfun-coverage-input -->

## Matriz de cobertura (insumos → RF)

| Referência insumo (doc § / ID / tela) | Descrição curta | RF cobrindo | ou QA |
|---------------------------------------|-----------------|-------------|--------|""")
for rf in D.RFS:
    r.append(f"| especificacao-funcional.md §3 {rf[0]} | {rf[1]} | {RF_NOVO[rf[0]]} | — |")
for tela, rfs in T.COBERTURA_TELAS:
    r.append(f"| ETF §6.6 · tela «{tela}» | tela do protótipo | {', '.join(rfs)} | — |")
r.append("| protótipo v3 · «Cobrança Ativa — Lista de Ligações» | cobrança por telefone (INF-001) | — | fora da v1 (decisão de Pedro, 2026-11-13) |")
r.append("| ETF §2.1 · contumazes | exclusão de contumazes na carteira | RF-MOD-QUALIFICACAO-01 | QA-04 |")

r.append("""
<!-- id: reqfun-tobe -->

## Visão TO-BE de negócio (delta vs. AS-IS)

| Domínio | Estado AS-IS (legacy.md § ou fonte) | Estado TO-BE (capacidade de negócio) | Delta principal | RFs envolvidos |
|---------|-------------------------------------|--------------------------------------|-----------------|----------------|
| Ingestão e Carteira Consolidada | processo manual: consulta a CCF, SNE e SUCOM e foto mensal (F-194, F-195) | visão única diária por contribuinte e tributo | de mensal e manual para diário e automático | RF-MOD-INGESTAO-01 a 15 |
| Qualificação da Carteira | seleção empírica, sorteio manual do controle (F-189, F-193) | critérios versionados com prévia e sorteio reproduzível | seleção auditável e replicável | RF-MOD-QUALIFICACAO-01 a 06 |
| Scoring de Liquidez | não existe | score da UFMT usado com fallback | priorização com base analítica | RF-MOD-SCORE-01 a 04 |
| Réguas de Cobrança | disparo com confirmação manual em lote (F-192) | réguas automáticas multicanal com consentimento | fim da confirmação manual | RF-MOD-REGUAS-01 a 09 |
| Cobrança Qualificada | distribuição por planilha, histórico disperso (F-190, F-196) | casos distribuídos, fila priorizada, dossiê e interações | fim da planilha e histórico por caso | RF-MOD-QUALIFICADA-01 a 07 |
| Monitoramento | indicadores por extração manual (F-191) | painéis diários com efeito incremental | medição causal | RF-MOD-MONITORAMENTO-01 a 08 |
| Governança | sem controle formal | acesso por papel, mascaramento e auditoria | conformidade com LGPD e auditoria | RF-MOD-GOVERNANCA-01 a 06 |

<!-- id: reqfun-traceability -->

## Rastreabilidade global (RF / RNF)

| ID | Tipo | Módulo | Domínio / categoria | Legacy / benchmark / vision | Fato fonte (F-xxx) |
|----|------|--------|---------------------|----------------------------|---------------------|""")
for rf in D.RFS:
    mod = RF_MOD[rf[0]]
    r.append(f"| {RF_NOVO[rf[0]]} | RF | {mod} | {MOD[mod][1]} | product-vision.md §5 | {RASTRO[rf[0]]} |")
for x in RNFS:
    r.append(f"| {x[0]} | RNF | {x[4]} | {x[2]} | product-vision.md §4 | {x[12]} |")

r.append("\n---\n\n<!-- id: rf -->\n\n## Requisitos funcionais por módulo\n")
for mod, a, bb in FAIXAS:
    r.append(f"## Módulo: {MOD[mod][1]} (`{mod}`)\n")
    for rf in [x for x in D.RFS if RF_MOD[x[0]] == mod]:
        (rid, tit, ator, quero, para, ears, mosc, cx, c1, c2, c3, rns, dep) = rf
        g = []
        for i, c in enumerate((c1, c2, c3), 1):
            corpo, nome = cen(c)
            g.append(f"Cenário {i}: {nome}\n{corpo}")
        rn_txt = ", ".join(RN_NOVO[x] for x in rns) or "—"
        if rid == "RF-023":
            rn_txt = RN_NOVO["X-RF-023"]
        if rid == "RF-045":
            rn_txt = ", ".join(RN_NOVO[x] for x in rns) + ", " + RN_NOVO["X-RF-045"]
        r.append(f"""### {RF_NOVO[rid]}: {tit}

**Épico:** {MOD[mod][1]}
**Funcionalidade:** {tit}

**Descrição (User Story):**
Como {ator.lower() if not ator.startswith(('UFMT', 'Provedor')) else ator},
quero {quero},
para {para}.

**Enunciado EARS *(1 padrão)*:** {ears}

**Atores:** {ator}
**Prioridade MoSCoW:** {mosc}
**Complexidade:** {cx}

**Pré-condições:**
- Usuário autenticado na instância com o papel que a matriz de acesso exige, ou sistema parceiro com o próprio usuário de integração

**Critérios de Aceite (BDD):**

```gherkin
{chr(10).join(g)}
```

**Regras de Negócio aplicáveis:** {rn_txt}
**Dependências:** {dep}
**Rastreabilidade:** {RASTRO[rid]}
**Notas:** promove {rid} do Explore.{BLOQ.get(rid, "")}

---
""")

r.append("""<!-- id: reqfun-integrations -->

## Integrações negociais *(opcional)*

| Sistema / fonte institucional | Finalidade para o processo | Efeito observável para o ator | RF relacionados |
|-------------------------------|----------------------------|-------------------------------|-----------------|
| Conta Corrente Fiscal, MPI, Big Data, IPVA, ITCD, SNE/DT-e | enviar os débitos, parcelamentos e sinalizações do dia | a carteira mostra a posição atualizada de cada contribuinte | RF-MOD-INGESTAO-01 a 12 |
| UFMT (modelo de score) | enviar o score de liquidez por lote | a fila e a carteira passam a considerar o score | RF-MOD-SCORE-01 a 03 |
| Provedor de e-mail, SMS e WhatsApp | entregar as mensagens das réguas e devolver o status | o coordenador vê o que foi entregue e o que falhou | RF-MOD-REGUAS-05 a 07 |

<!-- id: rnf -->

## Requisitos Não Funcionais (negócio)

> Os valores-alvo abaixo são **propostas desta simulação**, derivadas dos volumes das fontes; a
> Coordenação e a TI precisam validá-los (QA-02).
""")
for (rid, tit, cat, mosc, mod, decl, c6, ind, alvo, cond, acc, metodo, rast, vinc) in RNFS:
    r.append(f"""### {rid}: {tit}

**Categoria (ISO 25010):** {cat}
**Prioridade MoSCoW:** {mosc}
**Módulo principal *(opcional)*:** {mod}

**Declaração:** {decl}

**Cenário (6 partes):**
- Fonte do estímulo: {c6[0]}
- Estímulo: {c6[1]}
- Ambiente: {c6[2]}
- Artefato: {c6[3]}
- Resposta: {c6[4]}
- Medida da resposta *(numérica — obrigatória)*: {c6[5]}

**Métrica mensurável:**
- Indicador: {ind}
- Valor alvo: {alvo}
- Condições: {cond}

**Critério de aceite:** {acc}

**Método de verificação:** {metodo}

**Rastreabilidade:** {rast}
**Vinculado a:** {vinc}

---
""")

r.append("<!-- id: rf-rnf-matrix -->\n\n## Matriz RF ↔ RNF\n\n| RF | Título | Módulo | RNFs impactados |\n|----|--------|--------|-----------------|")
imp = {}
for x in RNFS:
    for alvo in x[13].split(", "):
        imp.setdefault(alvo, []).append(x[0])
for rf in D.RFS:
    nid = RF_NOVO[rf[0]]
    r.append(f"| {nid} | {rf[1]} | {RF_MOD[rf[0]]} | {', '.join(imp.get(nid, [])) or '—'} |")
r.append(f"""
<!-- id: reqfun-open-questions -->

## Questões em aberto

| QA | Descrição | Onde aparece | Sugestão de tratamento |
|----|-----------|---------------|-------------------------|
| QA-01 | Desempate entre massificada e qualificada para quem atende aos dois critérios | RF-MOD-QUALIFICACAO-04 | Coordenação decide (gaps.md GAP-007) |
| QA-02 | Valores-alvo dos RNF de desempenho e confiabilidade são propostas desta simulação | RNF-DES-001, RNF-DES-002, RNF-CONF-001, RNF-CONF-002 | Validar com a Coordenação e a TI |
| QA-03 | Atribuição de origem quando há contato por mais de um canal na janela | RF-MOD-MONITORAMENTO-02 | Validar com a Coordenação (GAP-008) |
| QA-04 | Fonte da lista de contumazes: CCF ou Credep | RF-MOD-QUALIFICACAO-01 | TI confirma (GAP-017) |
""")
(OUT / "requirements").mkdir(exist_ok=True)
(OUT / "requirements" / "requirements.md").write_text("\n".join(r), encoding="utf-8")

# ---------- product-requirements.md + flow-map.md
T.gerar(OUT, HOJE, RF_NOVO, RN_NOVO, MOD, FMAP)
print("ok:", len(D.RFS), "RF;", len(regras), "RN;", len(RNFS), "RNF")
