"""Gera outputs/spec/test-plan.md (spec-test-plan) a partir de requirements.md, business-rules.md e flow-map.md.

Uso: python3 -I tp_gerar.py <raiz-do-projeto>
"""
import re
import sys
from datetime import date
from pathlib import Path

RAIZ = Path(sys.argv[1])
SPEC = RAIZ / "outputs" / "spec"
REQ = (SPEC / "requirements" / "requirements.md").read_text(encoding="utf-8")
BR = (SPEC / "business-rules.md").read_text(encoding="utf-8")
FM = (SPEC / "flow-map.md").read_text(encoding="utf-8")

# ------------------------------------------------------------------ leitura
MODULOS = []  # (codigo, nome)
for m in re.finditer(r"^## Módulo: (.+?) \(`(MOD-[A-Z-]+)`\)", REQ, re.M):
    MODULOS.append((m.group(2), m.group(1)))

RFS = []
for bloco in re.split(r"\n(?=### RF-MOD-)", REQ):
    m = re.match(r"### (RF-MOD-([A-Z]+)-\d+): (.+)", bloco)
    if not m:
        continue
    rf = {"id": m.group(1), "mod": "MOD-" + m.group(2), "titulo": m.group(3).strip()}
    rf["atores"] = re.search(r"\*\*Atores:\*\* (.+)", bloco).group(1).strip()
    us = re.search(r"\*\*Descrição \(User Story\):\*\*\n(.+?)\n\n", bloco, re.S)
    rf["historia"] = " ".join(us.group(1).split()) if us else ""
    rns = re.search(r"\*\*Regras de Negócio aplicáveis:\*\* (.+)", bloco)
    rf["rns"] = re.findall(r"RN-NOVO-[A-Z]+-\d+", rns.group(1)) if rns else []
    cen = []
    for c in re.finditer(r"Cenário \d+: (.+)\n\s+Dado (.+)\n\s+Quando (.+)\n\s+Então (.+)", bloco):
        d = {k: v.strip() for k, v in zip(("nome", "dado", "quando", "entao"), c.groups())}
        d["dado"] = re.sub(r"^que ", "", d["dado"])
        cen.append(d)
    rf["cenarios"] = cen
    RFS.append(rf)

RNS = {}
for bloco in re.split(r"\n(?=#### RN-)", BR):
    m = re.match(r"#### (RN-[\w-]+): (.+)", bloco)
    if not m:
        continue
    campo = lambda f: (re.search(r"\*\*" + f + r"\*\* \| (.*?) \|\n", bloco) or [None, ""])[1]  # noqa: E731
    RNS[m.group(1)] = {"id": m.group(1), "titulo": m.group(2).strip(), "tipo": campo("Tipo"),
                       "enunciado": campo("Enunciado"), "vinc": re.findall(r"RF-MOD-[A-Z]+-\d+", campo("Vinculada a")),
                       "mod": "MOD-" + {"ING": "INGESTAO", "QUA": "QUALIFICACAO", "SCO": "SCORE", "REG": "REGUAS",
                                        "CQ": "QUALIFICADA", "MON": "MONITORAMENTO", "GOV": "GOVERNANCA"}[m.group(1).split("-")[2]],
                       "conflitos": campo("Conflitos")}

TELAS = []
sec = FM.split("## Telas", 1)[1].split("\n## ", 1)[0]
for linha in sec.splitlines():
    c = [x.strip() for x in linha.strip().strip("|").split("|")]
    if len(c) >= 6 and c[0].startswith("TEL-"):
        TELAS.append({"id": c[0], "nome": c[1], "mod": c[3], "estados": [e.strip() for e in c[4].split(",")],
                      "rfs": re.findall(r"RF-MOD-[A-Z]+-\d+", c[5])})
TELA_DO_RF = {}
for t in TELAS:
    for r in t["rfs"]:
        TELA_DO_RF.setdefault(r, t)
TELA_DO_MOD = {}
for t in TELAS:
    TELA_DO_MOD.setdefault(t["mod"], t)

PR = (SPEC / "product-requirements" / "product-requirements.md").read_text(encoding="utf-8")
CAMPOS = []
for linha in PR.splitlines():
    c = [x.strip() for x in linha.strip().strip("|").split("|")]
    if len(c) == 12 and c[0] not in ("Campo",) and not c[0].startswith("-") and re.search(r"RF-MOD", c[11]):
        CAMPOS.append({"campo": c[0], "rotulo": c[1], "tipo": c[2], "obrig": c[3], "limites": c[9],
                       "valid": c[10], "rfs": re.findall(r"RF-MOD-[A-Z]+-\d+", c[11])})

# ------------------------------------------------------------------ perfis
PERFIL = {
    "Gestor de Integração": "Gestor de Integração", "Coordenador": "Coordenador de Cobrança",
    "Atendente": "Atendente", "Auditor": "Auditor", "Admin": "Administrador",
}
SISTEMA = {"Sistema parceiro", "UFMT (sistema)", "Provedor de mensagens (sistema)"}


def perfil_executor(rf):
    a = rf["atores"]
    if a in PERFIL:
        return PERFIL[a]
    if a in SISTEMA:
        return "Gestor de Integração, usando o simulador de cargas"
    # «Sistema»: rotina automática; quem confere é o dono do módulo
    return {"MOD-INGESTAO": "Gestor de Integração", "MOD-QUALIFICADA": "Coordenador de Cobrança",
            "MOD-GOVERNANCA": "Administrador"}.get(rf["mod"], "Coordenador de Cobrança")


def perfil_negado(rf):
    exe = perfil_executor(rf)
    if rf["mod"] == "MOD-QUALIFICADA" or exe == "Atendente":
        return "Administrador", "o Administrador não tem acesso operacional a casos"
    if exe.startswith("Gestor de Integração") or rf["mod"] == "MOD-INGESTAO":
        return "Atendente", "o Atendente não acompanha cargas nem a carteira inteira; vê só os casos dele"
    if exe == "Administrador":
        return "Coordenador de Cobrança", "parâmetros, faixas e metas são só do Administrador"
    if exe == "Auditor":
        return "Atendente", "a auditoria é só do Auditor"
    return "Auditor", "o Auditor só lê; não altera nada"


# ------------------------------------------------------------------ casos
casos = []  # dicts: id, epica, titulo, cat, objetivo, perfil, rel, pre, passos, esperado
contador = [0]


def novo(epica, titulo, cat, objetivo, perfil, rel, pre, passos, esperado, rf=None):
    contador[0] += 1
    c = {"id": f"TC-{contador[0]:03d}", "epica": epica, "titulo": titulo, "cat": cat, "objetivo": objetivo,
         "perfil": perfil, "rel": rel, "pre": pre, "passos": passos, "esperado": esperado, "rf": rf}
    casos.append(c)
    return c


def classifica(cen, idx):
    txt = (cen["nome"] + " " + cen["dado"] + " " + cen["quando"] + " " + cen["entao"]).lower()
    if idx == 0:
        return "PRINCIPAL"
    if re.search(r"outra api|outro atendente|de outro|sem permiss|não tem acesso|papel|perfil|sem o papel", txt):
        return "ACESSO"
    if re.search(r"inválid|ausente|sem versão|obrigatóri|formato|sem modelo|vari[aá]vel inexistente|incomplet", txt):
        return "VALIDAÇÃO"
    if re.search(r"repetid|de novo|duplic|fora de sequência|zero|nenhum|sem score|sem lote|vazi|limite|máxim|empate|mesmo", txt):
        return "BORDA"
    if re.search(r"«[^»]+»\s*$|fica «|passa a|muda|encerrad|pausad|retom|publicad|confirmad", txt):
        return "ESTADO"
    return "REGRA"


def frase(t):
    t = t.strip().rstrip(".")
    return t[0].upper() + t[1:] if t else t


def passos_cenario(rf, cen, perfil, tela):
    integ = rf["atores"] in SISTEMA
    p = [f"Entre na instância com o usuário de teste do perfil **{perfil.split(',')[0]}** (Anexo A)."]
    if integ:
        p.append("Abra **Cobrança Inteligente › Integrações & Sincronização** e clique em **Simular carga** (simulador de cargas das fontes, que só existe fora de produção).")
        p.append(f"Monte a situação no simulador: {cen['dado']}.")
        p.append(f"Execute: {cen['quando']}.")
        p.append(f"Volte à tela **{tela['nome']}** e localize o lote ou o registro do teste.")
    else:
        p.append(f"Abra **Cobrança Inteligente › {tela['nome']}**.")
        p.append(f"Confirme que a situação de partida existe: {cen['dado']} (dados do Anexo B).")
        p.append(f"Execute: {cen['quando']}.")
        p.append(f"Observe o resultado na tela **{tela['nome']}**.")
    return p


EPICA = {mod: f"EPIC-{i + 1:03d}" for i, (mod, _) in enumerate(MODULOS)}
FALHA = "Capturar print da tela (com a data e a hora), anotar o passo em que falhou e registrar no chamado de homologação citando o código deste caso."

# ---- derivações: casos com valores de entrada e resultado calculado
DERIV = {
    "RN-NOVO-ING-001": dict(
        titulo="Juntar débitos de duas fontes no mesmo contribuinte e somar a posição do tributo",
        pre=["Contribuinte de teste `Empresa Sintética Ltda`, CNPJ `11.222.333/0001-81`, ainda sem débitos (Anexo B).",
             "Simulador de cargas disponível no ambiente de homologação."],
        passos=["Entre com o perfil **Gestor de Integração** (Anexo A).",
                "No simulador, gere um lote da CCF com 1 débito de ICMS Normal: CNPJ `11.222.333/0001-81` (com pontuação), valor `R$ 1.000,00`, vencido há `40` dias.",
                "Gere um lote da SNE com 1 débito de ICMS Normal: CNPJ `11222333000181` (só números), valor `R$ 500,00`, vencido há `70` dias.",
                "Feche os dois lotes e aguarde a consolidação.",
                "Abra **Visão Única do Contribuinte** e pesquise o CNPJ `11.222.333/0001-81`."],
        esperado=["Existe um único contribuinte com esse CNPJ — o documento com e sem pontuação foi reconhecido como o mesmo.",
                  "A posição de ICMS Normal mostra total em aberto de `R$ 1.500,00` (1.000 + 500), maior atraso de `70` dias e `2` débitos.",
                  "O total em aberto do contribuinte é `R$ 1.500,00` e o maior atraso é `70` dias."]),
    "RN-NOVO-QUA-003": dict(
        titulo="Sortear 3% da carteira como grupo de controle, arredondando para cima",
        pre=["Parâmetro do grupo de controle em `3%` (padrão).", "Versão de critérios publicada que gera exatamente `1.001` itens na carteira (massa do Anexo B)."],
        passos=["Entre com o perfil **Coordenador de Cobrança** (Anexo A).",
                "Abra **Prévia da Carteira Segmentada** e simule a carteira do ciclo com a versão publicada.",
                "Confirme a carteira.",
                "Filtre os itens marcados como **Grupo de controle** e anote a quantidade e a semente do sorteio mostrada na carteira.",
                "Peça ao Gestor de Integração para refazer o sorteio no ambiente de homologação com a mesma semente e compare os itens sorteados."],
        esperado=["São marcados `31` itens como grupo de controle: 3% de 1.001 é 30,03, arredondado para cima.",
                  "A semente do sorteio aparece gravada na carteira.",
                  "Com a mesma semente, os mesmos 31 itens são sorteados.",
                  "Nenhum item do grupo de controle recebe régua nem vira caso."]),
    "RN-NOVO-QUA-004": dict(
        titulo="Entrar na carteira só quem atende a todos os critérios da versão",
        pre=["Versão de critérios com: valor mínimo `R$ 5.000,00`, tributo `ICMS Normal`, atraso mínimo `60` dias, instrumento `Todos`, excluir contumazes `Sim`, score mínimo `0,50`.",
             "Cinco contribuintes de teste com ICMS Normal vencido há `90` dias (Anexo B): A com `R$ 8.000,00` e score `0,70`; B com `R$ 4.000,00` e score `0,90`; C com `R$ 9.000,00`, score `0,80` e marca de contumaz; D com `R$ 6.000,00` e sem score; E com `R$ 7.000,00` e score `0,30`."],
        passos=["Entre com o perfil **Coordenador de Cobrança** (Anexo A).",
                "Abra **Critérios de Qualificação** e selecione a versão de teste.",
                "Clique em **Simular carteira**.",
                "Abra **Prévia da Carteira Segmentada** e filtre pelos cinco contribuintes de teste."],
        esperado=["Entram `2` contribuintes: A (atende a tudo) e D (sem score, segue sem o filtro de score).",
                  "B fica fora pelo valor (R$ 4.000,00 < R$ 5.000,00); C fica fora por ser contumaz; E fica fora pelo score (0,30 < 0,50)."]),
    "RN-NOVO-SCO-002": dict(
        titulo="Classificar o score na faixa certa, com o limite inferior incluído",
        pre=["Faixas vigentes: Baixa de `0,00` até menos de `0,40`; Média de `0,40` até menos de `0,70`; Alta de `0,70` até `1,00`.",
             "Quatro contribuintes de teste com débito em aberto (Anexo B)."],
        passos=["Entre com o perfil **Gestor de Integração** (Anexo A).",
                "No simulador, gere um lote de score da UFMT, versão do modelo `2.1`, com os valores `0,39`, `0,40`, `1,00` e `1,20`, um para cada contribuinte de teste.",
                "Feche o lote.",
                "Abra **Painel do Score de Liquidez** e confira a faixa de cada contribuinte."],
        esperado=["`0,39` fica na faixa **Baixa**; `0,40` fica na faixa **Média** (o limite inferior pertence à faixa).",
                  "`1,00` fica na faixa **Alta**.",
                  "`1,20` não cabe em nenhuma faixa: o registro é recusado pelo formato (o score vai de 0 a 1) e o Gestor de Integração vê o alerta."]),
    "RN-NOVO-CQ-001": dict(
        titulo="Atribuir o caso novo ao atendente com menos casos; no empate, ao que recebeu há mais tempo",
        pre=["Grupo de atendentes `Grupo ICMS Teste` com três atendentes de teste (Anexo A): Atendente A1 com `5` casos abertos; A2 com `3` casos, último recebido em `11/11/2026 09:00`; A3 com `3` casos, último recebido em `12/11/2026 10:00`.",
             "Carteira de teste pronta para criar 1 caso de ICMS (Anexo B)."],
        passos=["Entre com o perfil **Coordenador de Cobrança** (Anexo A).",
                "Abra **Prévia da Carteira Segmentada** e confirme a carteira que cria o caso de teste.",
                "Abra o caso criado em **Dossiê & Caso**.",
                "Confira o atendente responsável e o histórico do caso."],
        esperado=["O caso é atribuído à Atendente **A2**: A2 e A3 têm 3 casos (menos que os 5 de A1) e A2 recebeu caso há mais tempo.",
                  "O histórico do caso registra a atribuição automática com data e hora."]),
    "RN-NOVO-CQ-003": dict(
        titulo="Ordenar a fila do atendente pela prioridade calculada com score, valor e atraso",
        pre=["Carteira do ciclo em que o menor valor em aberto é `R$ 1.000,00`, o maior é `R$ 11.000,00`, o menor atraso é `0` dias e o maior é `200` dias (Anexo B).",
             "Atendente A1 com dois casos: X — valor `R$ 6.000,00`, atraso `150` dias, score `0,80`; Y — valor `R$ 11.000,00`, atraso `50` dias, sem score."],
        passos=["Entre com o perfil **Atendente** como A1 (Anexo A).",
                "Abra **Minha Fila**.",
                "Ordene pela coluna **Prioridade**, da maior para a menor.",
                "Anote a prioridade mostrada nos casos X e Y."],
        esperado=["Caso X: valor normalizado `0,50` ((6.000 − 1.000) ÷ 10.000), atraso normalizado `0,75` (150 ÷ 200); prioridade = (0,80 + 0,50 + 0,75) ÷ 3 = `0,68`.",
                  "Caso Y, sem score: valor `1,00`, atraso `0,25`; prioridade = (1,00 + 0,25) ÷ 2 = `0,63` (0,625 arredondado).",
                  "X aparece antes de Y na fila."]),
    "RN-NOVO-MON-003": dict(
        titulo="Calcular a origem da regularização pela janela de 30 dias",
        pre=["Janela de atribuição em `30` dias (padrão).",
             "Três débitos de teste regularizados em `10/11/2026` (Anexo B): débito 1 com SMS entregue em `25/10/2026` e e-mail entregue em `05/11/2026`; débito 2 com único contato (SMS entregue) em `20/09/2026`; débito 3 de um item do grupo de controle."],
        passos=["Entre com o perfil **Coordenador de Cobrança** (Anexo A).",
                "Peça ao Gestor de Integração para carregar, pelo simulador, a regularização dos três débitos em `10/11/2026`.",
                "Abra **Regularizações & Origem** e filtre pela data `10/11/2026`.",
                "Confira a origem e o canal de cada regularização."],
        esperado=["Débito 1: origem **Resposta à cobrança**, canal **E-mail** (o contato mais recente dentro dos 30 dias); o e-mail fica marcado como pago em até 30 dias.",
                  "Débito 2: origem **Espontânea** (o SMS foi 51 dias antes, fora da janela).",
                  "Débito 3: origem **Espontânea** (item do grupo de controle)."]),
    "RN-NOVO-MON-005": dict(
        titulo="Calcular o efeito incremental contra o grupo de controle",
        pre=["Ciclo de teste com carteira confirmada (Anexo B): `970` itens notificados fora do controle, dos quais `194` regularizados; `30` itens no grupo de controle, dos quais `3` regularizados."],
        passos=["Entre com o perfil **Coordenador de Cobrança** (Anexo A).",
                "Abra **Painel Institucional de Cobrança**.",
                "Selecione o ciclo de teste no filtro de período.",
                "Leia o indicador **Efeito incremental**."],
        esperado=["Taxa da carteira cobrada = 194 ÷ 970 = `20,0%`; taxa do controle = 3 ÷ 30 = `10,0%`.",
                  "O painel mostra efeito incremental de `10,0` pontos percentuais."]),
}

feitos_rn = {}  # RN -> TC que a exercita como REGRA
por_rf = {}     # RF -> {cat: [tc]}


def regra_tc(rn_id, rf, epica):
    rn = RNS[rn_id]
    if rn_id in feitos_rn:
        return feitos_rn[rn_id]
    if rn["tipo"] == "Derivação":
        d = DERIV[rn_id]
        c = novo(epica, d["titulo"], "REGRA",
                 f"Confirmar o cálculo da regra «{rn['titulo']}» com valores conhecidos ({rn_id}).",
                 "ver passo 1", f"{rf['id'] if rf else ', '.join(rn['vinc'][:1])}, {rn_id}", d["pre"], d["passos"], d["esperado"], rf and rf["id"])
        c["perfil"] = re.search(r"\*\*(.+?)\*\*", d["passos"][0]).group(1)
    else:
        enun = rn["enunciado"]
        m = re.match(r"SE (.+?) ENTÃO (.+)", enun)
        se, entao = (m.group(1), m.group(2)) if m else (enun, "o sistema cumpre a regra")
        alvo = rf or next((r for r in RFS if r["id"] in rn["vinc"]), None)
        tela = TELA_DO_RF.get(alvo["id"]) if alvo else TELA_DO_MOD[rn["mod"]]
        tela = tela or TELA_DO_MOD[rn["mod"]]
        perfil = perfil_executor(alvo) if alvo else "Coordenador de Cobrança"
        esperado = [frase(entao) + "."]
        if "BLOQUEADO" in rn["conflitos"]:
            esperado.append("Enquanto o GAP-028 estiver aberto, nenhuma comunicação de ICMS, ITCD ou parcelamento sai: só o IPVA, que tem fonte de opt-in.")
        c = novo(epica, f"Cumprir a regra «{rn['titulo']}»", "REGRA",
                 f"Confirmar que, quando {se}, {entao} ({rn_id}).", perfil,
                 ", ".join(([alvo["id"]] if alvo else []) + [rn_id]),
                 [f"Situação preparada com a massa do Anexo B: {se}.", f"Usuário de teste do perfil {perfil.split(',')[0]} disponível (Anexo A)."],
                 [f"Entre com o usuário de teste do perfil **{perfil.split(',')[0]}** (Anexo A).",
                  f"Abra **Cobrança Inteligente › {tela['nome']}**.",
                  f"Localize o registro de teste em que {se}.",
                  "Execute a ação ou aguarde a rotina que aplica a regra (carga, régua ou fechamento do ciclo, conforme o caso).",
                  f"Confira o resultado na tela **{tela['nome']}**."],
                 esperado, alvo and alvo["id"])
    feitos_rn[rn_id] = c
    return c


for mod, nome_mod in MODULOS:
    ep = EPICA[mod]
    for rf in [r for r in RFS if r["mod"] == mod]:
        por_rf[rf["id"]] = {k: [] for k in ("PRINCIPAL", "VALIDAÇÃO", "REGRA", "ACESSO", "ESTADO", "INTEGRAÇÃO", "BORDA")}
        tela = TELA_DO_RF.get(rf["id"]) or TELA_DO_MOD[mod]
        perfil = perfil_executor(rf)
        for i, cen in enumerate(rf["cenarios"]):
            cat = classifica(cen, i)
            if rf["atores"] in SISTEMA and cat in ("PRINCIPAL",):
                cat_real = "PRINCIPAL"
            else:
                cat_real = cat
            if rf["atores"] in SISTEMA and cat in ("REGRA", "ESTADO"):
                cat_real = "INTEGRAÇÃO"
            rel = [rf["id"]] + (rf["rns"] if cat_real in ("REGRA", "BORDA", "VALIDAÇÃO") else [])
            c = novo(ep, f"{rf['titulo']}: {cen['nome'][0].lower() + cen['nome'][1:]}", cat_real,
                     f"Partindo desta situação — {cen['dado'][0].lower() + cen['dado'][1:]} —, confirmar que, quando {cen['quando'][0].lower() + cen['quando'][1:]}, {cen['entao'][0].lower() + cen['entao'][1:]}.",
                     perfil, ", ".join(rel),
                     [f"Usuário de teste do perfil {perfil.split(',')[0]} disponível (Anexo A).",
                      f"Situação de partida montada com a massa do Anexo B: {cen['dado']}."],
                     passos_cenario(rf, cen, perfil, tela),
                     [frase(cen["entao"]) + "."], rf["id"])
            por_rf[rf["id"]][cat_real].append(c["id"])
        # VALIDAÇÃO e BORDA a partir do inventário de campos da tela
        campos_rf = [k for k in CAMPOS if rf["id"] in k["rfs"]]
        if not por_rf[rf["id"]]["VALIDAÇÃO"]:
            k = next((k for k in campos_rf if "→" in k["valid"]), None) or next((k for k in campos_rf if k["obrig"] == "Sim"), None)
            if not k:
                k = next((k for k in campos_rf if k["tipo"] == "daterange" and k["limites"].startswith("máx")), None)
                if k:
                    k = dict(k, valid="período de `01/01/2025` a `31/03/2026` (15 meses, acima do " + k["limites"] + ") → «O período pode ter no máximo 12 meses»")
            if k:
                if "→" in k["valid"]:
                    cond, msg = [x.strip() for x in k["valid"].split("→", 1)]
                else:
                    cond, msg = "vazio", "«Preencha este campo»"
                acao = (f"Deixe o campo **{k['rotulo']}** em branco" if cond.startswith("vazio")
                        else f"Preencha o campo **{k['rotulo']}** de forma que fique nesta situação: {cond}")
                c = novo(ep, f"{rf['titulo']}: campo {k['rotulo']} inválido", "VALIDAÇÃO",
                         f"Confirmar que a tela recusa o campo {k['rotulo']} quando {cond} e explica o que corrigir.", perfil,
                         rf["id"], [f"Usuário de teste do perfil {perfil.split(',')[0]} disponível (Anexo A).", "Massa do Anexo B carregada."],
                         [f"Entre com o usuário de teste do perfil **{perfil.split(',')[0]}** (Anexo A).",
                          f"Abra **Cobrança Inteligente › {tela['nome']}** e comece a ação: {rf['titulo'].lower()}.",
                          f"{acao}; preencha os demais campos obrigatórios com valores válidos do Anexo B.",
                          "Clique em **Salvar** (ou na ação de confirmar da tela)."],
                         [f"O sistema não salva e mostra a mensagem {msg} junto do campo **{k['rotulo']}**.",
                          "Nada é gravado; ao corrigir o campo, o registro salva normalmente."], rf["id"])
                por_rf[rf["id"]]["VALIDAÇÃO"].append(c["id"])
        if not por_rf[rf["id"]]["BORDA"]:
            k = next((k for k in campos_rf if re.match(r"^\d+ a \d+$", k["limites"]) or re.match(r"^até \d+ caracteres$", k["limites"])), None)
            if k:
                m2 = re.match(r"^(\d+) a (\d+)$", k["limites"])
                if m2:
                    lo, hi = int(m2.group(1)), int(m2.group(2))
                    valores = f"`{lo - 1}`, `{lo}`, `{hi}` e `{hi + 1}`"
                    esper = [f"`{lo}` e `{hi}` são aceitos (os limites fazem parte da faixa).",
                             f"`{lo - 1}` e `{hi + 1}` são recusados com a mensagem da tela{(' ' + k['valid'].split('→')[1].strip()) if '→' in k['valid'] else ''}."]
                else:
                    n = int(re.search(r"\d+", k["limites"]).group(0))
                    valores = f"um texto com exatamente `{n}` caracteres e outro com `{n + 1}` caracteres"
                    esper = [f"O texto com {n} caracteres é aceito inteiro.",
                             f"O campo não deixa passar do caractere {n}: o {n + 1}º não entra ou a tela avisa o limite."]
                c = novo(ep, f"{rf['titulo']}: limites do campo {k['rotulo']}", "BORDA",
                         f"Confirmar o comportamento nos limites do campo {k['rotulo']} ({k['limites']}).", perfil, rf["id"],
                         [f"Usuário de teste do perfil {perfil.split(',')[0]} disponível (Anexo A).", "Massa do Anexo B carregada."],
                         [f"Entre com o usuário de teste do perfil **{perfil.split(',')[0]}** (Anexo A).",
                          f"Abra **Cobrança Inteligente › {tela['nome']}** e comece a ação: {rf['titulo'].lower()}.",
                          f"Preencha o campo **{k['rotulo']}**, um de cada vez, com {valores}, e clique em **Salvar** a cada tentativa."],
                         esper, rf["id"])
                por_rf[rf["id"]]["BORDA"].append(c["id"])
        # REGRA por RN aplicável
        for rn in rf["rns"]:
            if rn in RNS:
                c = regra_tc(rn, rf, ep)
                por_rf[rf["id"]]["REGRA"].append(c["id"])
        # ACESSO
        if not por_rf[rf["id"]]["ACESSO"]:
            neg, motivo = perfil_negado(rf)
            c = novo(ep, f"{rf['titulo']}: perfil sem permissão não consegue", "ACESSO",
                     f"Confirmar que o perfil {neg} não executa esta funcionalidade, porque {motivo}.", neg, rf["id"],
                     [f"Usuário de teste do perfil {neg} disponível (Anexo A).", "Massa do Anexo B carregada."],
                     [f"Entre com o usuário de teste do perfil **{neg}** (Anexo A).",
                      f"Procure no menu **Cobrança Inteligente** a tela **{tela['nome']}**.",
                      f"Se a tela aparecer, tente: {rf['titulo'].lower()}.",
                      f"Copie o endereço da tela **{tela['nome']}** aberto pelo perfil autorizado, cole no navegador do perfil {neg} e tente de novo."],
                     [f"O perfil {neg} não consegue {rf['titulo'].lower()}: a opção não aparece ou o sistema mostra que não há permissão.",
                      "Abrindo pelo endereço direto, o sistema também não mostra nem altera o registro (a permissão vale no dado, não só no menu)."],
                     rf["id"])
            por_rf[rf["id"]]["ACESSO"].append(c["id"])

    # RNs do módulo que nenhum RF citou
    for rn_id, rn in RNS.items():
        if rn["mod"] == mod and rn_id not in feitos_rn:
            alvo = next((r for r in RFS if r["id"] in rn["vinc"]), None)
            c = regra_tc(rn_id, alvo, ep)
            if alvo:
                por_rf[alvo["id"]]["REGRA"].append(c["id"])
    # ESTADO por tela (estados de UI)
    for t in [t for t in TELAS if t["mod"] == mod]:
        perfil = perfil_executor(next(r for r in RFS if r["id"] == t["rfs"][0]))
        acoes = {
            "Carregando": "Abra a tela logo após entrar e observe enquanto os dados chegam.",
            "Sucesso": "Com a massa do Anexo B carregada, abra a tela e salve ou confirme uma ação permitida ao perfil.",
            "Erro de validação": "Tente salvar deixando em branco um campo obrigatório da tela (ou digite um valor fora da lista).",
            "Erro de sistema": "Peça ao Gestor de Integração para simular a indisponibilidade da rotina que alimenta a tela no ambiente de homologação e recarregue a tela.",
            "Vazio": "Aplique um filtro que não encontra nenhum registro, por exemplo o documento `00000000000`.",
            "Offline": "Desligue a rede do computador e tente recarregar a tela; depois religue.",
        }
        esper = {
            "Carregando": "Enquanto carrega, a tela mostra o indicador de carregamento e não mostra dado pela metade.",
            "Sucesso": "Depois da ação, a tela mostra a mensagem de confirmação e o registro atualizado.",
            "Erro de validação": "A tela não salva, marca o campo com problema e diz em português o que corrigir.",
            "Erro de sistema": "A tela mostra uma mensagem genérica em português, sem detalhe técnico, e orienta tentar mais tarde.",
            "Vazio": "A tela mostra que não há registros para o filtro, com orientação do que fazer, em vez de uma lista em branco.",
            "Offline": "O navegador avisa que está sem conexão; ao religar e recarregar, a tela volta ao normal sem perder dado já salvo.",
        }
        passos = [f"Entre com o usuário de teste do perfil **{perfil.split(',')[0]}** (Anexo A) e abra **Cobrança Inteligente › {t['nome']}**."]
        esperado = []
        for e in t["estados"]:
            passos.append(f"Estado **{e}**: {acoes.get(e, 'Provoque o estado ' + e + '.')}")
            esperado.append(f"Estado **{e}**: {esper.get(e, 'A tela mostra o estado ' + e + ' de forma clara.')}")
        c = novo(ep, f"Estados da tela {t['nome']}", "ESTADO",
                 f"Confirmar que a tela {t['nome']} mostra corretamente os {len(t['estados'])} estados previstos: {', '.join(t['estados'])}.",
                 perfil, ", ".join(t["rfs"][:3]),
                 [f"Usuário de teste do perfil {perfil.split(',')[0]} disponível (Anexo A).", "Massa do Anexo B carregada."],
                 passos, esperado, t["rfs"][0])
        t["tc"] = c["id"]

# ------------------------------------------------------------------ emissão
hoje = date.today().isoformat()
cats = ["PRINCIPAL", "VALIDAÇÃO", "REGRA", "ACESSO", "ESTADO", "INTEGRAÇÃO", "BORDA"]
cont = {k: sum(1 for c in casos if c["cat"] == k) for k in cats}

# matriz por RF e justificativas
JUST = {
    "VALIDAÇÃO": "a funcionalidade não tem entrada digitada pelo usuário nesta tela (rotina automática ou painel de leitura); a validação de entrada fica nos casos da tela de origem e no estado «Erro de validação» do caso de estados da tela",
    "BORDA": "os cenários de aceite não trazem situação-limite própria; os limites gerais (lista vazia, rede fora) estão no caso de estados da tela",
    "REGRA": "a funcionalidade não tem regra de negócio própria no catálogo de regras",
}
linhas_matriz = []
sem_matriz = 0
for rf in RFS:
    m = por_rf[rf["id"]]
    falta = [k for k in ("VALIDAÇÃO", "REGRA", "BORDA") if not m[k]]
    if falta:
        sem_matriz += 1
    just = "; ".join(f"sem {k}: {JUST[k]}" for k in falta) or "—"
    cel = lambda k: ", ".join(dict.fromkeys(m[k])) or "—"  # noqa: E731
    linhas_matriz.append(f"| {rf['id']} | {cel('PRINCIPAL')} | {cel('VALIDAÇÃO')} | {cel('REGRA')} | {cel('ACESSO')} | {cel('BORDA')}{(' · ' + cel('ESTADO')) if m['ESTADO'] else ''} | {just} |")

# cobertura RN
cob = []
for rn_id, rn in RNS.items():
    tcs = [c["id"] for c in casos if re.search(r"\b" + re.escape(rn_id) + r"\b", c["rel"])]
    status = "✅ Coberta" if tcs else "⚠️ Não coberta — justificativa: sem efeito visível na homologação"
    cob.append(f"| {rn_id} | {rn['titulo']} | {', '.join(tcs) or '—'} | {status} |")
cobertas = sum(1 for l in cob if "✅" in l)

# sinais de tamanho
sinais = []
for mod, nome in MODULOS:
    ep = EPICA[mod]
    n = sum(1 for c in casos if c["epica"] == ep)
    nrf = sum(1 for r in RFS if r["mod"] == mod)
    nt = sum(1 for t in TELAS if t["mod"] == mod)
    if n > 20 or nrf > 6 or nt > 4:
        sinais.append((ep, nome, n, nrf, nt))

out = []
w = out.append
w("# Plano de Testes — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)\n")
w(f"**Versão:** 1.0 | **Data:** {hoje} | **Gerado por:** spec-test-plan v1.0\n")
avisos = [f"{len(sinais)} épicas acima do tamanho recomendado (sugestão de divisão na seção «Tamanho das épicas»)"]
if sem_matriz:
    avisos.append(f"{sem_matriz} funcionalidades sem caso próprio de validação, regra ou situação-limite — justificativa por funcionalidade na seção «Matriz de cenários por funcionalidade»")
w(f"> ⚠️ ATENÇÃO: {len(avisos)} avisos — revisar antes de usar em homologação: " + "; ".join(avisos) + ".\n")
w("> **Como usar este documento:**\n> Execute cada caso de teste na ordem indicada dentro de cada épica.\n> Marque o resultado como ✅ Aprovado, ❌ Reprovado ou ⏭️ Pulado (com justificativa).\n> Em caso de reprovação, capture evidências (print de tela) e abra um chamado.\n")
w("---\n\n## Metadados\n")
w("| Campo | Valor |\n|-------|-------|")
w("| Projeto | Cobrança Inteligente — 2.6 Cobrança (SEFAZ-MT), aplicação na plataforma ServiceNow |")
w(f"| Épicas cobertas | {', '.join(EPICA.values())} — todos os 7 módulos (simulação; decisor Pedro) |")
w(f"| Total de casos de teste | {len(casos)} |")
w("| Responsável pelos testes | A preencher |")
w("| Ambiente alvo | Homologação |")
w("| Ambiente de integrações (sandbox/mock) | Simulador: as seis fontes e a UFMT entram pelo simulador de cargas da própria aplicação (lotes válidos, inválidos e repetidos — RF-MOD-INGESTAO-15); o provedor de e-mail, SMS e WhatsApp é um simulador até a contratação (GAP-004). Nenhum sistema parceiro real é usado |")
w("| Perfis de usuário cobertos | Gestor de Integração, Coordenador de Cobrança, Atendente (dois usuários, para testar o isolamento), Auditor, Administrador — os 5 papéis da aplicação |")
w("| Data de execução | A preencher |\n| Versão testada | A preencher |\n")
w("---\n\n## Glossário\n")
w("| Termo | Significado |\n|-------|-------------|")
for t, s in [("Fonte", "Sistema da SEFAZ que envia débitos ou score: CCF (Conta Corrente Fiscal), MPI, Big Data, IPVA, ITCD, SNE/DT-e e UFMT."),
             ("Lote", "Remessa diária de uma fonte, enviada em pacotes numerados."), ("Carteira", "Lista de contribuintes escolhidos para cobrança no ciclo."),
             ("Grupo de controle", "Parte da carteira sorteada que não é cobrada, para medir o efeito da cobrança."),
             ("Régua", "Sequência de mensagens (e-mail, SMS, WhatsApp) enviadas em etapas."), ("Caso", "Contribuinte encaminhado a um atendente para cobrança qualificada."),
             ("Opt-in", "Autorização do contribuinte para receber mensagem por um canal."), ("Simulador de cargas", "Função da aplicação, só fora de produção, que gera lotes de teste das fontes."),
             ("RF / RN", "Requisito funcional / regra de negócio — o código no fim de cada caso aponta o requisito ou a regra testada.")]:
    w(f"| {t} | {s} |")
w("")
w("---\n\n## Sumário de Execução\n")
w("| ID | Título | Categoria | Épica | Status |\n|----|--------|-----------|-------|--------|")
for c in casos:
    w(f"| {c['id']} | {c['titulo']} | {c['cat']} | {c['epica']} | ⬜ Pendente |")
w("\n> Legenda: ⬜ Pendente · ✅ Aprovado · ❌ Reprovado · ⏭️ Pulado\n")

DESC_MOD = {}
for m in re.finditer(r"^## Módulo: .+?\(`(MOD-[A-Z-]+)`\)\n+(.+?)\n", REQ, re.M):
    DESC_MOD[m.group(1)] = m.group(2).strip()
for mod, nome in MODULOS:
    ep = EPICA[mod]
    w("---\n")
    w(f"## [{ep}] — {nome}\n")
    w(f"> **Descrição da épica:** testes de homologação do módulo {nome} ({mod}): {sum(1 for r in RFS if r['mod'] == mod)} funcionalidades e {sum(1 for t in TELAS if t['mod'] == mod)} telas.\n")
    w("### Pré-requisitos da Épica\n")
    w("- Ambiente de homologação disponível, com a massa de dados do Anexo B carregada e sem dado pessoal real.")
    w("- Usuários de teste dos perfis do Anexo A criados.")
    if mod in ("MOD-INGESTAO", "MOD-SCORE"):
        w("- Simulador de cargas habilitado (só existe fora de produção); os sistemas parceiros reais não são usados.")
    if mod == "MOD-REGUAS":
        w("- Simulador do provedor de mensagens ativo; opt-in de IPVA carregado para os contribuintes de teste (GAP-028 bloqueia ICMS, ITCD e parcelamentos).")
    w("")
    for c in [c for c in casos if c["epica"] == ep]:
        w("---\n")
        w(f"### [{c['id']}] {c['titulo']} [{c['cat']}]\n")
        w("| Campo | Conteúdo |\n|-------|----------|")
        w(f"| **Objetivo** | {c['objetivo']} |")
        w(f"| **Perfil do testador** | {c['perfil']} |")
        w(f"| **RN/RF relacionado** | {c['rel']} |\n")
        w("**Pré-condições:**")
        for p in c["pre"]:
            w(f"- {p}")
        w("\n**Passos:**")
        for i, p in enumerate(c["passos"], 1):
            w(f"{i}. {p}")
        w("\n**Resultado esperado:**")
        for e in c["esperado"]:
            w(f"- ✅ {e}")
        w("\n**Resultado obtido:** _(em branco — preenchido na homologação)_\n")
        w(f"**Em caso de falha:** {FALHA}\n")

w("---\n\n## Tamanho das épicas\n")
w("Épicas grandes ficam difíceis de homologar numa sessão. As abaixo passam do tamanho recomendado (cerca de 20 casos, 6 funcionalidades ou 4 telas); a sugestão é dividir pela jornada indicada. Os casos não foram cortados.\n")
w("| Épica | Casos | Funcionalidades | Telas | Sugestão de divisão |\n|-------|-------|-----------------|-------|---------------------|")
SUG = {"MOD-INGESTAO": "(a) recebimento e validação de lotes; (b) fechamento do ciclo, falhas e reprocesso; (c) carteira e visão única",
       "MOD-QUALIFICACAO": "(a) critérios e versões; (b) simulação, confirmação e grupo de controle",
       "MOD-SCORE": "(a) recebimento e faixas; (b) painel e operação sem score",
       "MOD-REGUAS": "(a) montagem e controle da régua; (b) envio, consentimento e status de entrega",
       "MOD-QUALIFICADA": "(a) fila e distribuição; (b) dossiê, interações e encerramento",
       "MOD-MONITORAMENTO": "(a) regularização e origem; (b) painéis e indicadores",
       "MOD-GOVERNANCA": "(a) acesso, isolamento e mascaramento; (b) parâmetros e auditoria"}
for ep, nome, n, nrf, nt in sinais:
    mod = [m for m, e in EPICA.items() if e == ep][0]
    w(f"| {ep} — {nome} | {n} | {nrf} | {nt} | {SUG.get(mod, 'por jornada')} |")
w("")
w("---\n\n## Matriz de cenários por funcionalidade\n")
w("Cada funcionalidade precisa de caso para o caminho feliz, entrada inválida, regra de negócio, perfil sem permissão e situação-limite. Quando uma categoria não se aplica, a última coluna explica por quê.\n")
w("| RF | Caminho feliz | Validação | Regra | Acesso | Limite (· estado) | Justificativa da categoria ausente |\n|----|---------------|-----------|-------|--------|-------------------|------------------------------------|")
for l in linhas_matriz:
    w(l)
w("")
w("---\n\n## Cobertura RN × Caso\n")
w("| RN | Descrição curta | Casos que cobrem | Status |\n|----|-----------------|------------------|--------|")
for l in cob:
    w(l)
w("")
w("---\n\n## Anexos\n")
w("### Anexo A — Usuários de Teste\n")
w("| Perfil | Usuário | Senha | Observação |\n|--------|---------|-------|------------|")
for p, u, o in [("Gestor de Integração", "teste.gestor.integracao", "Usa o simulador de cargas"),
                ("Coordenador de Cobrança", "teste.coordenador", "Publica critérios, confirma carteira, gerencia réguas"),
                ("Atendente", "teste.atendente.a1", "Dono dos casos de teste da fila A1"),
                ("Atendente", "teste.atendente.a2", "Segundo atendente, para testar o isolamento e a distribuição"),
                ("Atendente", "teste.atendente.a3", "Terceiro atendente do grupo de distribuição"),
                ("Auditor", "teste.auditor", "Só leitura"), ("Administrador", "teste.admin", "Parâmetros, faixas e metas")]:
    w(f"| {p} | `{u}` | [definir com a equipe — nunca registrar aqui] | {o} |")
w("\n### Anexo B — Dados Pré-necessários\n")
w("Todos os dados são fictícios. CPF e CNPJ abaixo são números de teste com dígito válido, que não pertencem a pessoas reais; nunca usar dado de contribuinte real (LGPD).\n")
w("| Dado | Valor de teste | Usado em |\n|------|----------------|----------|")
for d, v, u in [("Contribuinte PJ principal", "`Empresa Sintética Ltda`, CNPJ `11.222.333/0001-81`", "ingestão, carteira, casos"),
                ("Contribuinte PF principal", "`Contribuinte Sintético da Silva`, CPF `529.982.247-25`", "ingestão, réguas, mascaramento"),
                ("Documento inválido", "CPF `529.982.247-00` (dígito errado)", "rejeição de registro"),
                ("Documento sem contribuinte", "CPF `111.444.777-35`", "score de contribuinte inexistente"),
                ("Cinco contribuintes da versão de critérios", "A a E, conforme o caso de aplicação dos critérios", "qualificação"),
                ("Carteira de 1.001 itens", "gerada pelo simulador com débitos de ICMS acima do valor mínimo", "grupo de controle"),
                ("Grupo de atendentes", "`Grupo ICMS Teste` com A1, A2 e A3", "distribuição de casos"),
                ("Faixas de score", "Baixa 0,00–0,40 · Média 0,40–0,70 · Alta 0,70–1,00", "score"),
                ("Parâmetros", "grupo de controle 3% · janela de atribuição 30 dias · tentativas de reenvio 3", "vários"),
                ("Opt-in", "IPVA: e-mail e SMS autorizados para o CPF de teste", "réguas")]:
    w(f"| {d} | {v} | {u} |")
w("\n### Anexo C — Ambiente\n")
w("| Campo | Valor |\n|-------|-------|\n| Endereço | Instância de homologação da SEFAZ-MT (a preencher) |\n| Versão da aplicação | A preencher |\n| Data | A preencher |\n| Testador | A preencher |")

(SPEC / "test-plan.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("casos", len(casos), cont, "rns", cobertas, "/", len(RNS), "rf sem matriz", sem_matriz, "sinais", [s[0] for s in sinais])
