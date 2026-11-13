# Mapa de contexto — ingestão micro

Status: draft  
Última atualização: YYYY-MM-DD  
Fontes: [lista dos arquivos processados]

**Instrução:** não apagar seções; preencher ou declarar *não aplicável* / *ausente na fonte*.

<!-- id: context-overview -->

## Resumo executivo *(síntese — não substitui as tabelas abaixo)*

- Projeto / produto (nome provisório):
- Objeto do trabalho (uma frase):

---

<!-- id: source-files -->

## Inventário de arquivos em `inputs/`

| # | Caminho | Tipo | Tamanho / data | Lido na íntegra? |
|---|---------|------|----------------|------------------|
| 1 | | | | sim / parcial — porque |

---

<!-- id: atomic-by-source -->

## Extração atômica **por fonte**

### Fonte: `[nome-do-arquivo ou CHAT-YYYYMMDD-N]`

#### Fatos atômicos

| ID | Fato (máx. precisão; pode ser citação curta) | Âncora (§ + ID da fonte / minuto) | Domínio candidato | Conf. |
|----|-----------------------------------------------|---------------------------|-------------------|-------|
| F-001 | | | | alta/média/baixa |

<!-- Âncora: para fonte em outputs/explore/, o § do documento + o ID literal (RF-012, RN-003…); para transcrição, o minuto. Número de linha NÃO é âncora — muda a cada edição (plan.md do harness). -->

#### Inferências *(explicitamente não verbatim)*

| ID | Inferência | Fundamento | Risco |
|----|------------|------------|-------|
| INF-001 | | | |

#### Verbatim estendido *(opcional — quando fatos isolados destroem contexto)*

```
(colar bloco citado)
```

#### Itens ainda não classificados (NCR)

| ID | Texto / fato | Hipótese |
|----|---------------|----------|
| NCR-001 | | |

---

*(Repetir subsecção "### Fonte:" para cada arquivo relevante.)*

---

<!-- id: numbers-dates -->

## Números, datas, volumes, SLAs citados *(não perder)*

| Valor | Contexto | Fonte (ID F-xxx ou arquivo) |
|-------|----------|------------------------------|
| | | |

---

<!-- id: contradictions -->

## Contradições entre fontes

| Tema | Fonte A (ref) | Fonte B (ref) | Como resolver depois |
|------|---------------|----------------|----------------------|
| | | | |

---

<!-- id: domain-candidates -->

## Domínios de negócio *(candidatos)*

| Domínio (nome de negócio) | IDs de fatos que sustentam | Lacunas |
|---------------------------|-------------------------------|---------|
| | F-… | |

---

<!-- id: systems-integrations -->

## Sistemas, integrações, contratos mencionados

| Nome | Papel | Protocolo / dado | Fonte (F-xxx) |
|------|-------|------------------|---------------|
| | | | |

---

<!-- id: module-capacity-candidates -->

## Candidatos a módulo / capacidade *(opcional — alimenta spec-product Passo 3.0)*

*(Áreas de produto ou capacidades de alto nível sugeridas pelas fontes. **Não** são RF.)*

| Rótulo provisório | Fatos (F-xxx) | Colisão com domínio candidato (Passo 5)? | Nota para spec-product 3.0 |
|-------------------|----------------|-------------------------------------------|-----------------------------|
| | | | |

---

<!-- id: actors -->

## Atores e papéis

| Ator / papel | Responsabilidade citada | Frequência de uso | Fonte (F-xxx) |
|---------------|-------------------------|-------------------|----------------|
| | | | |

---

<!-- id: pains-metrics -->

## Dores e métricas *(com rasto)*

| Dor ou métrica | Impacto citado | Fonte |
|----------------|----------------|-------|
| | | |

---

<!-- id: open-questions -->

## Questões em aberto *(potenciais GAPs — só depois de esgotar fontes; sem criar IDs GAP-XXX aqui)*

| # | Pergunta | Evidência/contexto (F-xxx ou arquivo:linha) | Bloqueia próxima fase? |
|---|----------|-----------------------------------------------|--------------------------|
| | | | |
