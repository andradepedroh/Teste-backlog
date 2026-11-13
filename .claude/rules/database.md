---
description: "Modelo de dados da Cobrança Inteligente nas tabelas da plataforma ServiceNow: tabelas x_cbi_, acesso por GlideRecord, idempotência e auditoria"
alwaysApply: false
paths: **/*.js, **/*.xml
---

# Banco de dados — Cobrança Inteligente (2.6 Cobrança · SEFAZ-MT)

> Por que: a plataforma não tem banco próprio a escolher; o que protege a qualidade dos dados é
> usar as tabelas certas, gravar sem duplicar e nunca deixar papel humano escrever dado de origem.

---

## Banco e acesso

- **Tabelas da plataforma ServiceNow** no escopo `x_cbi_` (26 tabelas da ETF §4), reutilizando `sys_user` e estendendo `task` para caso e follow-up. Fonte: ETF §4; quadro técnico itens 3.1 e 3.2.
- Acesso por **GlideRecord** (gravação e leitura de registro) e **GlideAggregate** (contagens e somas). Nunca SQL direto.
- Sem cache próprio (quadro técnico item 3.4).

## Migrações e versão

- A estrutura das tabelas é versionada pela aplicação escopada, ligada ao GitHub pelo controle de versão do Studio, e promovida dev → homologação → produção. Fonte: quadro técnico item 3.3.
- Mudança de estrutura nunca é feita direto em produção.

## Regras de gravação

**MUST:**
- **Idempotência:** toda gravação da ingestão usa a chave natural da fonte (`id_origem`) e o identificador do lote (`id_lote_origem`). Reenvio atualiza, não duplica (RN-NOVO-ING-005).
- **Tabelas de origem** (contribuinte, débito, parcelamento, posição, vínculo, sinalização) só são gravadas pelas APIs de ingestão; nenhum papel humano tem escrita (RN-NOVO-ING-008).
- **Imutáveis:** versão de critérios publicada, carteira confirmada, interação e evento de auditoria — ACL de update e delete negada e Business Rule de bloqueio (RN-NOVO-QUA-005, RN-NOVO-CQ-002, RN-NOVO-GOV-003).
- **Posição por tributo gravada na carga**, não somada na consulta (ETF §2.1).
- Processar em **lotes** os cálculos sobre a base (~1,8 milhão de contribuintes): nunca carregar a base inteira em memória.

**MUST NOT:**
- GlideRecord sem condição sobre tabela grande.
- `deleteMultiple` em tabela de negócio.
- Gravar em tabela de outro módulo fora do Script Include dele.

## Dados pessoais

- CPF guardado só com dígitos e **mascarado por padrão** na leitura (ACL de campo), exceto para papéis autorizados (RN-NOVO-GOV-002).
- Retenção dos registros rejeitados e das comunicações a definir (GAP-024).

## Anti-padrões

- Consulta dentro de laço (N+1).
- Campo calculado recalculado na tela em vez de gravado.
- Choice com valor em português acentuado.
- Tabela de fotografia para indicadores (a ETF decidiu calcular direto das tabelas).
