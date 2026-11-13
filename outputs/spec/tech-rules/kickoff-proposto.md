# Kickoff técnico proposto — spec-tech-rules (aguardando confirmação)

Status: **aprovado** por Pedro em 2026-11-13, sem exceções
Última atualização: 2026-11-13
Decisor: Pedro
Fonte das perguntas: `.claude/skills/spec-tech-rules/references/kickoff-blocos.md` (10 blocos do kit)

> As opções do kit pressupõem sistema construído do zero (Java, Node, Next.js, Docker). A ETF fixou
> a plataforma **ServiceNow** (aplicação escopada no App Engine, telas nativas e Platform Analytics),
> então várias respostas são «Outra: ServiceNow nativo» ou «não se aplica».
>
> **Como responder:** confirme tudo ou liste as exceções pelo número (ex.: «4.1 → inglês»). As
> regras de segurança são geradas sempre, sem pergunta.

**0. Onde as regras serão usadas:** Claude Code (`ambiente=claude`, do kickoff no `sync-log.md`).

| # | Pergunta | Resposta sugerida | Fonte |
|---|---|---|---|
| 1.1 | Linguagem do backend | Outra: JavaScript do lado do servidor do ServiceNow (Script Includes, Business Rules, Scripted REST APIs, Flow Designer) | ETF §1.1 e §6 |
| 1.2 | Versão | Release da instância da SEFAZ-MT — a confirmar com a TI (questão em aberto) | — |
| 1.3 | Há interface? | Sim, outra stack: listas e formulários nativos + 2 painéis no Platform Analytics; sem Next.js | ETF §1.1, §6.6 |
| 2.1 | Estilo arquitetural | Monolito simples: uma aplicação escopada (`x_cbi_`), 7 módulos separados por menu | ETF §1.1 |
| 2.2 | Padrão interno | Em camadas: API (Scripted REST) → regras (Script Includes) → dados (tabelas); Business Rules só como gatilho | ETF §6.1, §6.2 |
| 2.3 | Práticas de código | Clean Code, com um Script Include por responsabilidade | ETF §6.1 |
| 2.4 | Comunicação entre módulos | Não se aplica (uma aplicação); processamento assíncrono por Scheduled Jobs e Flow Designer | ETF §6.3 |
| 3.1 | Banco de dados | Outro: tabelas da plataforma ServiceNow (26 tabelas `x_cbi_`) | ETF §4 |
| 3.2 | Acesso a dados | API de dados nativa da plataforma (GlideRecord / GlideAggregate) | ETF §6 |
| 3.3 | Migrações | Controle de versão da aplicação ligado ao GitHub (Source Control do Studio), com promoção entre instâncias | GitHub em uso |
| 3.4 | Cache | Não | — |
| 3.5 | Mensageria | Não se aplica (filas nativas da plataforma) | — |
| 4.1 | Idioma do código | Português nos identificadores, como na ETF (`x_cbi_contribuinte`, `ApiIngestaoBase`); interface em português do Brasil | ETF §4, §6.1 |
| 4.2 | Nomes no banco | snake_case com o prefixo do escopo `x_cbi_` | ETF §4 |
| 4.3 | Versão das APIs | Versão no caminho (`/api/x_cbi/v1/...`), porque os parceiros são externos | ETF §2.1 |
| 4.4 | Formato de erro | RFC 7807 para erro da requisição + resultado por registro no lote (aceito ou rejeitado, com motivo) | RN-NOVO-ING-004 |
| 4.5 | Paginação | APIs trabalham por lote e pacote; listas usam a paginação nativa | ETF §4.2 |
| 4.6 | Erros | Códigos de erro tipados (ex.: motivos de rejeição como lista fechada) | ETF §4.2 |
| 5.1 | Camadas de teste | Unitário + integração + E2E + carga | RNF-DES-001 e 002 |
| 5.2 | Cobertura mínima | Sem meta de % de linhas; exigido: toda regra de cálculo com teste e todos os cenários de aceite automatizados | 9 regras de cálculo |
| 5.3 | Ferramenta E2E | ATF (framework de testes nativo do ServiceNow), interface e API | plataforma |
| 5.4 | Teste de carga | k6 contra as APIs de ingestão, em homologação | RNF-DES-001 e 002 |
| 6.1 | Observabilidade | Logs estruturados + métricas | RNF-CON-001 |
| 6.2 | Destino | Recursos nativos do ServiceNow (logs do sistema e tabelas de execução de lotes), sem OpenTelemetry | ETF §4.2 |
| 6.3 | Formato de log | Estruturado, com o identificador do lote como chave de correlação | ETF §4.2 |
| 6.4 | Métricas de negócio | Sim: lotes por fonte, registros rejeitados, comunicações por canal e situação | RNF / F6 |
| 7.1 | Autenticação | Misto: SSO da SEFAZ-MT para usuários (da instância) + OAuth 2.0 com um usuário por fonte para as APIs | ETF §1.1, §2.1 |
| 7.2 | Autorização | Papéis e permissões por tabela e campo (5 papéis), com isolamento do atendente aos próprios casos | ETF §6.4 |
| 7.3 | Auditoria | Completa (dados pessoais e cliente governamental) | RN-NOVO-GOV-003 |
| 7.4 | Proteções extras | Limite de requisições nas APIs + reenvio sem duplicidade; upload não se aplica | RN-NOVO-ING-005 |
| 8.1 | Empacotamento | Aplicação escopada publicada entre instâncias, sem container | plataforma |
| 8.2 | Ambientes | Desenvolvimento → homologação → produção | plano, slide 13 |
| 8.3 | Branches | GitHub Flow (`main` + um branch por história), como o harness pede no Deliver | harness |
| 8.4 | Infraestrutura compartilhada | Sim: instância compartilhada com os outros produtos do Profisco, cada um no seu escopo | plano, slide 4 |
| 9.1 | Stack de frontend | Interface nativa do ServiceNow no lugar do padrão Next.js da empresa (exceção registrada) | ETF §1.1 |
| 9.2 | Acessibilidade (informativo) | WCAG 2.2 AA, definido pela regra de frontend do harness | harness |
| 9.3 | Idiomas | Só português do Brasil | — |
| 10.1 | Integrações | 7 APIs de entrada (CCF, MPI, Big Data, IPVA, ITCD, SNE/DT-e, Score UFMT) + provedor de mensagens e retorno de status; OAuth por fonte; adaptador por canal no provedor, com reenvio limitado; há dado pessoal (CPF e contato) | context-map |

## Respostas de Pedro

| # | Exceção ou confirmação |
|---|---|
| todos | «confirmo tudo» — Pedro, 2026-11-13 |
