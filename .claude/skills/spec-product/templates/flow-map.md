<!--
  flow-map.md — mapa canônico de Fluxos × Etapas × Telas × Transições do produto.

  GRAMÁTICA ESTRITA — este arquivo é validado por `python3 ../tools/check-flowmap.py` (caminho
  relativo ao SKILL.md que invoca; ver ../tools/references/paths.md).
  - Após o título nível 1, as 4 seções `## Fluxos`, `## Etapas`, `## Telas`, `## Transições`
    são obrigatórias, cada uma com UMA tabela de colunas fixas (não renomear, não reordenar,
    não adicionar/remover colunas). Prosa entre as seções é permitida e ignorada pelo parser.
  - IDs: FLX-001 / ETP-001 / TEL-001 / TRS-001 (três dígitos, únicos por seção).
  - Célula sem valor NUNCA fica vazia: usar `—`.
  - SCREENSHOT — convenção única: o arquivo mora em `outputs/spec/screens/<TEL-ID>.png`, e aqui é
    citado **relativo a `outputs/spec/`** (este .md também mora lá) → `screens/TEL-001.png`. É a
    única forma que o validador aceita. Artefatos lidos da raiz do repositório (ex.: `tasks.json`)
    prefixam `outputs/spec/` — mesma imagem, base diferente, nunca uma terceira forma.
    Ver ../tools/references/paths.md § «Convenção de screenshots de tela».
  - 5ª seção OPCIONAL `## Amarração Técnica` (| Tela | Entidades | Endpoints |): validada
    quando presente; ausente, nada muda. Ver instruções na própria seção abaixo.
  - Não existe flow-map.json persistido — este .md é a fonte única; scripts consomem a
    estrutura via `check-flowmap.py --json`.
-->

# Mapa de Fluxos e Telas — [Nome do Projeto]

Status: draft
Última atualização: YYYY-MM-DD
Fonte: discovery-document.md, legacy.md (PROC-xxx), product-requirements.md, business-rules.md

## Fluxos

*(Como derivar: fluxos AS-IS vêm dos processos do legado — `PROC-xxx` de `legacy.md`/`business-map.md`, quando existirem; fluxos TO-BE vêm do discovery e da visão de produto. Origem só se aplica a AS-IS; TO-BE sem origem = `—`.)*

| ID | Nome | Tipo | Ator principal | Origem (AS-IS) | Objetivo |
|----|------|------|----------------|----------------|----------|
| FLX-001 | Solicitação de cadastro | TO-BE | Requerente | — | Requerente cria e envia solicitação completa |
| FLX-002 | Aprovação da solicitação | AS-IS | Analista | PROC-CADASTRO-01 | Analista avalia e decide sobre a solicitação |

## Etapas

*(Uma linha por passo do fluxo. Ordem = inteiro ≥ 1, único dentro do fluxo. Tela = `TEL-xxx` da seção abaixo, ou `—` quando a etapa não tem UI — processamento, integração, job.)*

| ID | Fluxo | Ordem | Nome | Ator | Tela | Entrada | Saída |
|----|-------|-------|------|------|------|---------|-------|
| ETP-001 | FLX-001 | 1 | Preencher formulário | Requerente | TEL-001 | Dados pessoais | Rascunho salvo |
| ETP-002 | FLX-001 | 2 | Validar documentos | Sistema | — | Rascunho salvo | Solicitação validada |

## Telas

*(Como derivar: uma linha por tela documentada nos PR de `product-requirements.md` — RF/PR lista os IDs que a tela realiza. Módulo = `MOD-xxx` de `modules.md`. Screenshot: capturas do protótipo em `screens/TEL-xxx.png` — caminho relativo a `outputs/spec/`, onde o arquivo real é `outputs/spec/screens/TEL-xxx.png` —, ou `—` quando não existirem.)*

| ID | Nome | Rota | Módulo | Estados UI | RF/PR | Screenshot |
|----|------|------|--------|------------|-------|------------|
| TEL-001 | Formulário de solicitação | /solicitacoes/nova | MOD-CADASTRO | Carregando, Sucesso, Erro de validação | RF-MOD-CADASTRO-01, PR-MOD-CADASTRO-001 | screens/TEL-001.png |
| TEL-002 | Fila de aprovação | /aprovacoes | MOD-APROVACAO | Carregando, Sucesso, Vazio | PR-MOD-APROVACAO-001 | — |

## Transições

*(Como derivar: as regras que condicionam cada passagem vêm das RN de `business-rules.md`. De/Para = etapas existentes; Para = `—` marca fim de fluxo. Estado da entidade = `Entidade.estado` que a transição produz, ou `—`.)*

| ID | De | Para | Gatilho | Regras | Estado da entidade |
|----|----|------|---------|--------|--------------------|
| TRS-001 | ETP-001 | ETP-002 | Requerente clica em «Enviar» | RN-NOVO-CADASTRO-001 | Solicitacao.enviada |
| TRS-002 | ETP-002 | — | Validação concluída sem pendências | — | Solicitacao.validada |

## Amarração Técnica

*(Seção OPCIONAL — NÃO preencha no spec-product; é preenchida/atualizada pelas Fases 6a (spec-data-model → coluna Entidades) e 6b (spec-api-contracts → coluna Endpoints). No spec-product, deixe a seção ausente ou as colunas técnicas com `—`. Gramática quando presente: Tela = `TEL-xxx` existente em `## Telas`, única por linha; Entidades = nomes de entidade do data-model.json separados por vírgula, ou `—`; Endpoints = `METHOD /path` (GET|POST|PUT|PATCH|DELETE) separados por vírgula, ou `—`. Cross-check: `check-flowmap.py --data-model outputs/spec/data-model.json --contracts outputs/spec/api-contracts.yaml`.)*

| Tela | Entidades | Endpoints |
|------|-----------|-----------|
<!-- LINHAS DE EXEMPLO — NEUTRALIZADAS DE PROPÓSITO. Não descomentar no spec-product: o validador
     contaria «% telas com amarração técnica: 100%» sobre dados fictícios (métrica falsa). As Fases
     6a/6b substituem este bloco por linhas reais, uma por tela de `## Telas`:
| TEL-001 | Solicitacao | POST /solicitacoes, GET /solicitacoes/{id} |
| TEL-002 | Solicitacao, Aprovacao | GET /aprovacoes, POST /aprovacoes/{id}/decisao |
-->

*(Tabela intencionalmente **sem linhas** no `spec-product` — a seção existe só como cabeçalho, e a métrica «% telas com amarração técnica» sai corretamente em 0% até as Fases 6a/6b amarrarem. Alternativa igualmente válida: remover a seção inteira aqui.)*

## Cobertura

*(Seção NÃO parseada pelo validador. Após rodar `python3 ../tools/check-flowmap.py outputs/spec/flow-map.md` com exit 0, colar aqui o bloco MÉTRICAS impresso — % etapas com tela, % transições com RN, telas órfãs, fluxos sem etapas e matriz estado×tela — e tratar/justificar cada aviso.)*

```
[colar aqui a saída MÉTRICAS do check-flowmap.py]
```
