// Harness Elo v2 — Quais validadores rodam para esta entrega. Núcleo puro, sem I/O.
//
// Cada validador custa uma chamada de modelo. Rodar os seis em toda task é o desenho ingênuo que o
// plano mediu em milhões de tokens por rodada; aqui a dimensão só roda se a entrega toca o que ela
// examina, e a que fica de fora sai com o MOTIVO escrito — dispensa calada é o defeito que a
// `spec-implement` já proíbe na matriz de testes (`TEST_LAYERS_FROM_RULES`).

export const DIMENSOES = ['regras-negocio', 'testes', 'seguranca', 'performance', 'observabilidade', 'rules-tecnicas'];

/**
 * Lock de dependências: gerado pela ferramenta, não escrito por ninguém. Classe própria, que nenhum
 * validador lê (item 13.8, 2026-10-21): como `config`, um `package-lock.json` de 5 mil linhas virava
 * sete lotes do validador de segurança. A varredura determinística continua passando por ele — custa
 * só CPU —, e Semgrep e gitleaks também.
 */
const LOCK = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|poetry\.lock|Pipfile\.lock|uv\.lock|Cargo\.lock|Gemfile\.lock|composer\.lock|go\.sum|gradle\.lockfile|packages\.lock\.json)$/i;

/**
 * Configuração que o recorte de segurança precisa ver. Até 2026-10-21, `.tf`, `.sh`, `.ps1`,
 * `.properties` e `appsettings*.json` caíam em `outro`, e nenhum validador rodava sobre a senha do
 * `spring.datasource.password` nem sobre o script de deploy (item 13.8).
 */
const CONFIG = /(^|\/)(package\.json|tsconfig[^/]*\.json|appsettings[^/]*\.json|[^/]*\.(ya?ml|toml|ini|env|properties|tf|tfvars|hcl|sh|bash|ps1|psm1)|Dockerfile|\.env[^/]*)$/i;

/** Classe do arquivo pelo caminho. Teste é olhado primeiro: `PedidoTest.java` é teste, não código. */
export function classificar(caminho) {
  const p = String(caminho).replace(/\\/g, '/');
  if (/(^|\/)(__tests__|tests?|spec|e2e)\//i.test(p)
    || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(p)
    || /Tests?\.(java|kt|cs)$/.test(p)
    || /(_test\.(go|py)|(^|\/)test_[^/]*\.py)$/.test(p)) return 'teste';
  if (/\.(css|scss|sass|less)$/i.test(p)) return 'estilo';
  if (/\.(md|txt|rst|adoc)$/i.test(p)) return 'doc';
  if (/\.(m?[jt]sx?|cjs|java|kt|cs|go|py|rb|php|sql|vue|svelte|html|mdx)$/i.test(p)) return 'codigo';
  if (LOCK.test(p)) return 'lock';
  if (CONFIG.test(p)) return 'config';
  return 'outro';
}

// Heurísticas deliberadamente largas: o custo de rodar um validador barato à toa é pequeno; o de
// deixar de rodar o que devia é um defeito que passa. Caminho OU linha acrescentada bastam.
const PERFORMANCE_CAMINHO = /(repositor|repo\b|dao|query|queries|service|controller|route|handler|api\/)/i;
const PERFORMANCE_CODIGO = /\b(select|insert|update|delete|join|where)\b|\.(find\w*|query|aggregate|findMany|findAll)\s*\(|\b(prisma|sequelize|typeorm|knex|mongoose|axios)\b|\bfetch\s*\(|for\s*\(.*\)\s*\{[\s\S]*?\bawait\b/i;
const OBSERVABILIDADE_CODIGO = /\b(logger|log\.(info|warn|error|debug)|console\.(log|error|warn)|catch\s*\(|throw\s+new|router\.(get|post|put|patch|delete)|app\.(get|post|put|patch|delete)|@(Get|Post|Put|Patch|Delete|Request)Mapping|export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b)/;

/**
 * @param {{arquivos: {arquivo: string, classe: string, acrescentadas: string}[], temRegras: boolean}} entrada
 * @returns {{rodar: {dimensao: string, motivo: string}[], dispensadas: {dimensao: string, motivo: string}[]}}
 */
export function escolherDimensoes({ arquivos, temRegras }) {
  const codigo = arquivos.filter((a) => a.classe === 'codigo');
  const testes = arquivos.filter((a) => a.classe === 'teste');
  const visuais = arquivos.filter((a) => a.classe === 'estilo');
  const config = arquivos.filter((a) => a.classe === 'config');
  const rodar = [];
  const dispensadas = [];
  const decidir = (dimensao, sim, motivoSim, motivoNao) =>
    (sim ? rodar : dispensadas).push({ dimensao, motivo: sim ? motivoSim : motivoNao });

  decidir('regras-negocio', temRegras,
    'a task declara regra de negócio, cenário de aceite, tratamento de erro, estado de tela ou contrato',
    'a task não declara regra de negócio nem cenário de aceite');
  decidir('testes', temRegras || codigo.length > 0 || testes.length > 0,
    'há código ou regra a provar por teste',
    'a entrega não tem código nem regra a provar');
  decidir('seguranca', codigo.length > 0 || config.length > 0,
    'a entrega altera código ou configuração',
    'a entrega não altera código nem configuração');
  decidir('performance', codigo.some((a) => PERFORMANCE_CAMINHO.test(a.arquivo) || PERFORMANCE_CODIGO.test(a.acrescentadas)),
    'a entrega toca consulta, serviço, rota ou chamada externa',
    'a entrega não toca consulta, laço com I/O nem chamada externa');
  decidir('observabilidade', codigo.some((a) => OBSERVABILIDADE_CODIGO.test(a.acrescentadas)),
    'a entrega cria rota, tratamento de erro ou registro de log',
    'a entrega não cria rota, tratamento de erro nem log');
  decidir('rules-tecnicas', codigo.length > 0 || visuais.length > 0,
    'a entrega altera código ou estilo, que as rules técnicas regem',
    'a entrega não altera código nem estilo');
  return { rodar, dispensadas };
}
