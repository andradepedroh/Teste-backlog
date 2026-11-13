// Harness Elo v2 — Pré-flight dos pré-requisitos de máquina (§11.2 da spec, Decisão 23).
//
// EXECUTÁVEL DE MÃO (Decisão 20): roda uma vez, no clone recém-feito, por comando digitado.
//
// SÓ RELATA. Nunca bloqueia, nunca dispara sozinho, e sai SEMPRE com código 0 — quem precisar de
// veredito de máquina usa `--json` e lê `faltandoObrigatorio`. O desenho de contingência da §11.1
// previa bloquear as skills que dependem de `tools/*.py`; a Verificação 2 do primeiro dia foi
// executada e NÃO acionou esse fallback (Python real, executável de verdade), então a trava seria
// alcançável só por fato sintético. E ligar a sondagem ao `SessionStart` poria spawn de processo
// no caminho comum de toda sessão, que é o custo que a pré-passagem da rodada R removeu.

/**
 * O runtime que a sonda procura. É PARÂMETRO porque este mesmo módulo vai para a saída do
 * `gerar-kiro.mjs`, onde o runtime é o Kiro — e prosa não se reescreve por tabela de caminhos.
 * O valor de produção vem do `harness.json` (`runtime`), que o gerador reescreve; sem o campo,
 * vale o Claude Code.
 */
export const RUNTIME_PADRAO = {
  rotulo: 'Claude Code',
  cli: 'claude',
  semCli: 'Se você usa o app de desktop, isto é esperado e não é problema.',
};

/**
 * Os sete itens da §11.2. `obrigatorio` é o que faz o harness não funcionar; o resto degrada.
 *
 * `runtime` é sondado pelo CLI declarado em `RUNTIME_PADRAO` (ou no `harness.json`, campo
 * `runtime`), e a AUSÊNCIA DELE NÃO É VEREDITO: quem usa só a interface gráfica legitimamente
 * não tem o CLI no PATH. A mensagem (`semCli`) diz isso, em vez de acusar. É a única linha em
 * que "não achei" e "não tem" são coisas diferentes.
 */
export const ITENS = [
  { chave: 'runtime', rotulo: RUNTIME_PADRAO.rotulo, obrigatorio: true, para: 'runtime do agente — rules, skills, verificadores' },
  { chave: 'node', rotulo: 'Node ≥18', obrigatorio: true, para: 'verificadores do harness e os CLIs de skill' },
  { chave: 'git', rotulo: 'Git', obrigatorio: true, para: 'branch por US, gate no push, conexão ao ADO' },
  { chave: 'python', rotulo: 'Python 3', obrigatorio: true, para: 'os validadores tools/*.py do kit — check-flowmap.py é FATAL' },
  { chave: 'npm', rotulo: 'npm', obrigatorio: false, para: 'somente o protótipo — nenhum CLI do harness tem dependência externa' },
  { chave: 'pat', rotulo: 'PAT do Azure DevOps', obrigatorio: false, para: 'publicar os work items — validador CREDENTIALS_PRESENT' },
  { chave: 'opcionais', rotulo: 'pytm, scc, ast-grep, vale', obrigatorio: false, para: 'threat model, hotspots, lint — o kit tem rota degradada para cada um' },
];

const VARIAVEIS_DO_PAT = ['AZURE_DEVOPS_PAT', 'AZURE_DEVOPS_ORG', 'AZURE_DEVOPS_PROJECT'];
const SONDA_PYTHON = ['-c', 'import sys; print(sys.executable)'];

/**
 * A sonda do Python respondeu com um executável de verdade?
 *
 * ESTA FUNÇÃO É O MOTIVO DO MÓDULO EXISTIR. Em Windows, `python3` costuma ser um *App Execution
 * Alias*: ele "roda", sai com código 0, não imprime caminho nenhum e abre a Microsoft Store. Uma
 * verificação que olhasse só o código de saída declararia a máquina pronta, e a `spec-data-model`
 * falharia depois com exit code enganoso e mensagem que não ajuda.
 *
 * O que separa os dois casos é a SAÍDA: `sys.executable` de um Python real é um caminho — tem
 * barra. Uma saída como `Python 3.13.14` (a de `--version`, não a desta sonda, mas que um
 * `resultado` malformado poderia carregar) não tem barra nenhuma e não deve passar.
 */
export function ehPythonReal(resultado) {
  if (!resultado || !resultado.ok) return false;
  const saida = String(resultado.saida || '').trim();
  if (!saida) return false;
  return /[\\/]/.test(saida);
}

/** Sonda a máquina. Recebe `io` para ser testável sem tocar em processo nenhum. */
export function sondar(io, runtime = RUNTIME_PADRAO) {
  const cli = io.rodar(runtime.cli, ['--version']);
  const git = io.rodar('git', ['--version']);
  const npm = io.rodar('npm', ['--version']);

  const py3 = io.rodar('python3', SONDA_PYTHON);
  const py = ehPythonReal(py3) ? null : io.rodar('python', SONDA_PYTHON);

  const opcionais = {};
  for (const nome of ['pytm', 'scc', 'ast-grep', 'vale']) {
    opcionais[nome] = io.rodar(nome, ['--version']).ok;
  }

  const pat = {};
  // BOOLEAN, NÃO VALOR. É aqui que o vazamento de segredo é fechado, na origem: o conteúdo da
  // variável nunca entra no objeto de sondagem, então não há por onde ele chegar ao stdout, ao
  // `--json` de quem pipar a saída, ou ao log da sessão.
  for (const n of VARIAVEIS_DO_PAT) pat[n] = io.ambiente(n);

  return {
    runtime: { versao: cli.ok ? String(cli.saida || '').trim() : null },
    node: { versao: io.versaoDoNode() },
    git: { versao: git.ok ? String(git.saida || '').trim() : null },
    python: {
      comando: ehPythonReal(py3) ? 'python3' : (ehPythonReal(py) ? 'python' : null),
      aliasNoPython3: !ehPythonReal(py3) && Boolean(py3 && py3.ok),
      executavel: ehPythonReal(py3) ? String(py3.saida).trim() : (ehPythonReal(py) ? String(py.saida).trim() : null),
    },
    npm: { versao: npm.ok ? String(npm.saida || '').trim() : null },
    pat,
    opcionais,
  };
}

const maiorOuIgual18 = (v) => {
  const m = /^v?(\d+)\./.exec(String(v || ''));
  return Boolean(m) && Number(m[1]) >= 18;
};

export function avaliarSondagens(s, runtime = RUNTIME_PADRAO) {
  const itens = [];
  const faltandoObrigatorio = [];
  const registrar = (chave, ok, detalhe) => {
    const meta = ITENS.find((i) => i.chave === chave);
    itens.push({ ...meta, rotulo: chave === 'runtime' ? runtime.rotulo : meta.rotulo, ok, detalhe });
    if (meta.obrigatorio && !ok) faltandoObrigatorio.push(chave);
  };

  registrar('runtime', Boolean(s.runtime.versao),
    s.runtime.versao
      ? `CLI \`${runtime.cli}\` ${s.runtime.versao}`
      : `CLI \`${runtime.cli}\` não está no PATH. ${runtime.semCli}`);

  registrar('node', maiorOuIgual18(s.node.versao), `${s.node.versao}${maiorOuIgual18(s.node.versao) ? '' : ' — abaixo do piso de 18'}`);

  registrar('git', Boolean(s.git.versao), s.git.versao || 'não encontrado no PATH');

  if (s.python.comando === 'python3') {
    registrar('python', true, `\`python3\` → ${s.python.executavel}`);
  } else if (s.python.comando === 'python') {
    registrar('python', true,
      `\`python3\` ${s.python.aliasNoPython3 ? 'é um App Execution Alias — roda, não imprime executável, e abre a Microsoft Store' : 'não existe'}; ` +
      `\`python\` → ${s.python.executavel}. Os scripts do kit chamam \`python3\` primeiro e caem para \`python\`, ` +
      'então isto funciona — mas desligar o alias em Configurações › Aplicativos › Aliases de execução de aplicativo evita a próxima confusão.');
  } else {
    registrar('python', false,
      s.python.aliasNoPython3
        ? '`python3` é um App Execution Alias e `python` não existe. O alias abre a Microsoft Store e sai com código 0 — instale o Python de verdade e desligue o alias.'
        : 'nem `python3` nem `python` respondem');
  }

  registrar('npm', Boolean(s.npm.versao),
    (s.npm.versao ? `${s.npm.versao}. ` : 'não encontrado. ') +
    'Acesso ao registry: **não sondado** — sondar exige rede, e sondagem de rede pendura ' +
    '(2,5 a 42 s medidos numa share fora do ar). Confirme à mão, e só se for construir o protótipo nesta máquina.');

  const presentes = VARIAVEIS_DO_PAT.filter((n) => s.pat[n]);
  registrar('pat', presentes.length === VARIAVEIS_DO_PAT.length,
    `presentes: ${presentes.join(', ') || 'nenhuma'}${presentes.length === VARIAVEIS_DO_PAT.length ? '' :
      ` · faltam: ${VARIAVEIS_DO_PAT.filter((n) => !s.pat[n]).join(', ')}`}. ` +
    'Só a PRESENÇA é conferida; o valor não é lido nem impresso. Provisionamento tem prazo — não peça na véspera do marco do Plan.');

  const ok = Object.entries(s.opcionais).filter(([, v]) => v).map(([k]) => k);
  const nao = Object.entries(s.opcionais).filter(([, v]) => !v).map(([k]) => k);
  registrar('opcionais', true, `presentes: ${ok.join(', ') || 'nenhum'}${nao.length ? ` · ausentes: ${nao.join(', ')} (rota degradada)` : ''}`);

  return { itens, faltandoObrigatorio };
}

export function formatarTexto(r) {
  const l = ['PRÉ-REQUISITOS DE MÁQUINA — harness-elo-v2', ''];
  for (const i of r.itens) {
    l.push(`${i.ok ? '  ok  ' : ' FALTA'} ${i.rotulo}`);
    l.push(`        ${i.detalhe}`);
    l.push(`        para: ${i.para}`);
    l.push('');
  }
  l.push(r.faltandoObrigatorio.length
    ? `Faltando obrigatório: ${r.faltandoObrigatorio.join(', ')}. O harness não funciona assim.`
    : 'Nada obrigatório faltando.');
  return l.join('\n');
}

// ————————————————————————————— casca de I/O —————————————————————————————

import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** O `runtime` do `harness.json`, ou o padrão. Ausente cai no padrão; ilegível relança. */
export function lerRuntime(raiz, lerArquivo = readFileSync) {
  let bruto;
  try {
    bruto = lerArquivo(join(raiz, 'harness.json'), 'utf8');
  } catch (erro) {
    if (erro && (erro.code === 'ENOENT' || erro.code === 'ENOTDIR')) return RUNTIME_PADRAO;
    throw erro;
  }
  const h = JSON.parse(bruto);
  return h.runtime && h.runtime.cli ? h.runtime : RUNTIME_PADRAO;
}

export const IO_REAL = {
  /**
   * `shell: false` de propósito: nada aqui vem de entrada do usuário, e shell no meio
   * transformaria um nome de comando em superfície de injeção sem ganhar nada. `timeout` porque
   * um pré-flight que pendura é pior que um pré-flight que declara.
   */
  rodar: (comando, args) => {
    const r = spawnSync(comando, args || [], { encoding: 'utf8', shell: false, timeout: 5000 });
    if (r.error || r.status !== 0) return { ok: false, saida: String(r.stdout || ''), erro: String((r.error && r.error.code) || r.status) };
    return { ok: true, saida: String(r.stdout || ''), erro: '' };
  },
  versaoDoNode: () => 'v' + process.versions.node,
  ambiente: (nome) => Boolean(process.env[nome]),
};

function main(argv) {
  const runtime = lerRuntime(process.cwd());
  const r = avaliarSondagens(sondar(IO_REAL, runtime), runtime);
  process.stdout.write((argv.includes('--json') ? JSON.stringify(r, null, 2) : formatarTexto(r)) + '\n');
  // SEMPRE 0 — ver o cabeçalho. Quem quer veredito de máquina lê `faltandoObrigatorio` do `--json`.
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.exitCode = main(process.argv.slice(2));
}
