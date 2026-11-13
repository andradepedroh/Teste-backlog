// Harness Elo v2 — Asserções estruturais sobre a PROSA das skills editadas (Plano 5, Decisão 44).
//
// Uma skill do kit é um prompt em markdown: não há suíte que fique vermelha quando a prosa muda de
// sentido. O que dá para prender é a FORMA — a frase velha sumiu E a nova está lá, às duas pontas.
// Estes testes lêem a cópia vendorizada, então são também o alarme do merge de três pontas
// (MANUTENCAO.md): uma entrega do upstream que sobrescreva a nossa edição fica vermelha aqui.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR_SKILLS = join(RAIZ, '.claude', 'skills');
/** O texto de um arquivo da cópia vendorizada, relativo a `.claude/skills/`. */
const skill = (rel) => readFileSync(join(DIR_SKILLS, rel), 'utf8');
/** Índice da PRIMEIRA linha que casa a regex, ou -1. */
const linhaDe = (texto, re) => texto.split(/\r?\n/).findIndex((l) => re.test(l));

const INICIO = '<!-- linguagem-clara:v1 inicio -->';
const FIM = '<!-- linguagem-clara:v1 fim -->';
const blocoDe = (texto) => {
  const a = texto.indexOf(INICIO); const b = texto.indexOf(FIM);
  if (!(a >= 0 && b > a)) return null;
  // Achado ao rodar este teste (Task 2, 2026-09-10): duas skills do upstream
  // (spec-estimate-report, spec-status-report) chegam vendorizadas com fim de linha CRLF — o
  // snapshot preserva o fim de linha exatamente como o upstream mandou (ver .gitattributes), mas
  // a PROSA dentro do bloco é palavra por palavra a canônica. Normaliza para LF antes de comparar:
  // o que este teste audita é a prosa, não o separador de linha do arquivo vendorizado.
  return texto.slice(a, b + FIM.length).replace(/\r\n/g, '\n');
};
const todasAsSkills = () => readdirSync(DIR_SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(DIR_SKILLS, e.name, 'SKILL.md')))
  .map((e) => e.name).sort();

test('Decisão 42: TODA skill carrega o bloco «Linguagem clara»', () => {
  const sem = todasAsSkills().filter((s) => blocoDe(skill(`${s}/SKILL.md`)) === null);
  assert.deepEqual(sem, [], `sem bloco: ${sem.join(', ')}`);
});

test('Decisão 42: as duas skills nossas carregam o bloco CANÔNICO, byte-idêntico ao do orquestrador', () => {
  const canonico = blocoDe(skill('spec/SKILL.md'));
  for (const s of ['auditoria-de-us', 'revisao-de-seguranca']) {
    assert.equal(blocoDe(skill(`${s}/SKILL.md`)), canonico, `${s}: bloco diverge do canônico`);
  }
});

test('Decisão 42: só as duas skills de renderização do upstream têm a variante CLI, e a spec-frame o título dentro dos marcadores — ninguém mais', () => {
  // Medido em 2026-09-10: 22 skills com o bloco canônico byte-idêntico (LF), mais
  // spec-estimate-report e spec-status-report com a MESMA prosa vendorizada em CRLF (ver
  // blocoDe acima), e 2 "variante CLI" (spec-tasks-azure, spec-tasks-html) — 24 canônicos + 2
  // variante CLI, batendo com a Decisão 42. Se o upstream mudar isso, este teste diz onde — e é
  // o substituto do apply_linguagem_clara.py que a nossa cópia não tem.
  //
  // Kit de 29/09 (Plano 10): a spec-frame, skill nova, chega com a MESMA prosa canônica, mas com o
  // título «## Linguagem clara…» DENTRO dos marcadores, e não logo acima deles como nas outras. É
  // divergência do upstream, não nossa — o teste a nomeia e prova que, tirado o título, o bloco é o
  // canônico palavra por palavra.
  const canonico = blocoDe(skill('spec/SKILL.md'));
  const divergentes = todasAsSkills().filter((s) => blocoDe(skill(`${s}/SKILL.md`)) !== canonico);
  assert.deepEqual(divergentes, ['spec-frame', 'spec-tasks-azure', 'spec-tasks-html']);
  for (const s of ['spec-tasks-azure', 'spec-tasks-html']) {
    assert.match(blocoDe(skill(`${s}/SKILL.md`)), /variante CLI/);
  }
  const titulo = '## Linguagem clara — como escrever o que o humano vai ler (OBRIGATÓRIO)\n\n';
  assert.equal(blocoDe(skill('spec-frame/SKILL.md')).replace(titulo, ''), canonico,
    'spec-frame: tirado o título, o bloco tem que ser o canônico');
});

// ————————————————————————————— Item 2 da §8: o domínio Revisão na spec-report —————————————————————————————

test('item 2: a tabela de domínios tem a linha Revisão, condicionada ao revisao.json', () => {
  // A tabela saiu do SKILL.md para o MAINTENANCE.md na Onda 4 (é o que o gerador já implementa);
  // a regra continua na pasta da skill (P5), e o SKILL.md cita o domínio Revisão.
  assert.match(skill('spec-report/SKILL.md'), /Revisão/);
  const t = skill('spec-report/MAINTENANCE.md');
  const linha = t.split(/\r?\n/).find((l) => l.startsWith('| **Revisão** | `#revisao` |'));
  assert.ok(linha, 'a linha do domínio Revisão sumiu da tabela de domínios');
  assert.match(linha, /revisao\.json/, 'a linha não diz de qual artefato o domínio depende');
});

test('item 2: o validador DOMAIN_CONDITIONAL conhece Revisão e tech-rules', () => {
  const t = skill('spec-report/SKILL.md');
  const linha = t.split(/\r?\n/).find((l) => l.startsWith('| `DOMAIN_CONDITIONAL` |'));
  assert.ok(linha, 'o DOMAIN_CONDITIONAL sumiu da tabela de validadores');
  assert.match(linha, /Revisão/);
  assert.match(linha, /tech-rules-summary/);
});

test('item 2: a tabela de skills irmãs nomeia as duas fontes novas', () => {
  const t = skill('spec-report/SKILL.md');
  const linhas = t.split(/\r?\n/);
  assert.ok(
    linhas.some((l) => /^\| `spec-tech-rules` \|/.test(l) && /tech-rules-summary\.md/.test(l)),
    'a spec-tech-rules não está entre as skills irmãs'
  );
  // ancorado no início da linha da tabela de irmãs: a linha do domínio Revisão, na tabela de
  // domínios lá em cima, também cita revisao.mjs e revisao.json — o teste ficaria vacuamente
  // verde com ela se olhasse só as duas palavras.
  assert.ok(
    linhas.some((l) => /^\| \*revisão do harness\*/.test(l)
      && /revisao\.mjs/.test(l) && /revisao\.json/.test(l)),
    'a revisão do harness (revisao.mjs) não está entre as skills irmãs'
  );
});

// ————————————————————————————— Item 4 da §8: spec-test-plan antes da spec-tasks —————————————————————————————

test('item 4: a tabela canônica do orquestrador tem a spec-test-plan, ANTES da spec-tasks', () => {
  const t = skill('spec/SKILL.md');
  const iPlan = linhaDe(t, /^\| `spec-test-plan` \| 6c \|/);
  const iTasks = linhaDe(t, /^\| `spec-tasks` \| 7 \|/);
  assert.ok(iPlan > 0, 'a spec-test-plan não está na tabela canônica');
  assert.ok(iTasks > iPlan, 'a spec-test-plan tem que vir antes da spec-tasks');
});

test('item 4: a própria skill deixa de se chamar "Fase 7a" e diz quem consome quem', () => {
  const t = skill('spec-test-plan/SKILL.md');
  // Kit de 29/09 (Plano 10): o upstream renumerou as fases (a spec-frame entrou como Fase 1) e
  // chamou a skill de «Fase 8a», depois da spec-tasks (Fase 8). A nossa posição — antes da
  // spec-tasks, logo depois da spec-api-contracts (agora 7b) — passa a se chamar 7c.
  assert.doesNotMatch(t, /Fase 7a|Fase 8a/, 'um rótulo do upstream sobreviveu');
  assert.match(t, /Fase 7c/);
  assert.match(t, /roda ANTES da spec-tasks/);
});

test('item 4: a tabela artefato → path concorda com o orquestrador', () => {
  const t = skill('tools/references/paths.md');
  assert.doesNotMatch(t, /^\| 7a \| spec-test-plan/m);
  const iPlan = linhaDe(t, /^\| 6c \| spec-test-plan/);
  const iTasks = linhaDe(t, /^\| 7 \| spec-tasks \|/);
  assert.ok(iPlan > 0 && iTasks > iPlan);
});

test('item 4: a tabela canônica de fases da task-pipeline.md também concorda', () => {
  // Achado na revisão final do Plano 5: a Task 3 arrumou o orquestrador e a paths.md, mas a
  // terceira tabela — a canônica de fases da task-pipeline.md — continuava listando a
  // spec-test-plan como `7a`, DEPOIS da spec-tasks. Três tabelas, uma ordem só.
  //
  // Kit de 29/09 (Plano 10): esta tabela foi renumerada pelo upstream (spec-tasks 7 → 8, e a
  // spec-test-plan como 8a, depois dela); a nossa linha vira 7c, antes da spec-tasks.
  const t = skill('tools/references/task-pipeline.md');
  assert.doesNotMatch(t, /^\| (7a|8a) \| spec-test-plan/m);
  const iPlan = linhaDe(t, /^\| 7c \| spec-test-plan \|/);
  const iTasks = linhaDe(t, /^\| 8 \| spec-tasks \|/);
  assert.ok(iPlan > 0, 'a spec-test-plan não está na tabela canônica de fases');
  assert.ok(iTasks > iPlan, 'a spec-test-plan tem que vir antes da spec-tasks');
});

// ————————————————————————————— Item 7 da §8: a fronteira do orquestrador —————————————————————————————

test('item 7: o orquestrador sabe DE ONDE parte — o pacote do Explore é fonte, não fase a repetir', () => {
  const t = skill('spec/SKILL.md');
  assert.match(t, /\*\*De onde ele parte, neste harness:\*\*/);
  assert.match(t, /pacote de fontes/);
  assert.match(t, /outputs\/explore\//);
  // Revisão final do Plano 10: a condição era o marcador `_explore-congelado.md`, que só nasce
  // no fim da `spec-product` (`promocao.mjs --congelar`); no começo do Plan ele nunca existe.
  assert.match(t, /quando `outputs\/explore\/` traz o pré-projeto/);
  assert.doesNotMatch(t, /_explore-congelado\.md/);
  assert.match(t, /não repete o pré-projeto/);
  // e continua dizendo onde TERMINA — a metade que o upstream já escreveu
  assert.match(t, /\*\*Escopo deste repositório:\*\* definição de produto/);
});

test('spec-frame: parte do pré-projeto em outputs/explore/, não do marcador de congelamento', () => {
  // Revisão final do Plano 10: o parágrafo condicionava ao `_explore-congelado.md`, que a
  // `promocao.mjs --congelar` cria no fim da `spec-product`. A spec-frame roda no começo do
  // Plan, antes disso — com o marcador como condição, o parágrafo nunca disparava.
  const t = skill('spec-frame/SKILL.md');
  assert.match(t, /\*\*De onde ela parte, neste harness:\*\* quando `outputs\/explore\/` traz o pré-projeto/);
  assert.doesNotMatch(t, /_explore-congelado\.md/);
  // A rule tem dois endereços: o do Claude Code e o que o gerar-kiro reescreve na saída Kiro.
  assert.match(t, /`(\.claude\/rules\/harness\/plan|\.kiro\/fases\/harness-plan)\.md`/);
});

// ————————————————————————————— Item 3 da §8: a spec-security-review consome o kernel —————————————————————————————

test('item 3: o kernel é pré-requisito, e a razão é o gate deste harness', () => {
  const t = skill('spec-security-review/SKILL.md');
  assert.match(t, /^\| `plano-de-seguranca\.md` \| \*\*Sim\*\* .*CADEIA-SEC-01/m);
});

test('item 3: o Passo A carrega o kernel e o Passo E injeta os SEC dele antes de derivar qualquer coisa', () => {
  const t = skill('spec-security-review/SKILL.md');
  assert.match(t, /Ler `plano-de-seguranca\.md`.*Catálogo SEC/);
  assert.match(t, /### E\.0-K — Os `SEC-###` do kernel entram primeiro/);
  assert.match(t, /derivar por conta própria só o que o kernel não cobre/);
  assert.match(t, /Questões em aberto/);
});

test('item 3: o validador KERNEL_CONSUMED existe, é FATAL (Decisão 68), e a revisao-de-seguranca é skill irmã', () => {
  const t = skill('spec-security-review/SKILL.md');
  // Era WARNING até 2026-10-20; a Decisão 68 (plano de melhoria das skills, Onda 5) o tornou FATAL,
  // com o inject-sec.mjs --kernel conferindo por máquina.
  assert.match(t, /^\| `KERNEL_CONSUMED` \| .* \| FATAL \|\r?$/m);
  assert.match(t, /^\| `revisao-de-seguranca` \| Tempo B, ordem 3 \|/m);
});

test('item 3: a description e o Papel dizem a mesma coisa que o E.0-K — o kernel é a fonte primária', () => {
  const t = skill('spec-security-review/SKILL.md');
  assert.match(t, /^description: >[\s\S]*?plano-de-seguranca\.md[\s\S]*?\n---/m);
  assert.match(t, /\*\*A fonte primária é o kernel\.\*\*/);
});


// ————————————————————————————— Item 5 da §8: fidelidade Média sem src/ (Decisão 41) —————————————————————————————

test('item 5: a linha Média do Padrão de Qualidade para de exigir rota e passa a exigir presença no Inventário', () => {
  const t = skill('spec-prototype/SKILL.md');
  const media = t.split(/\r?\n/).find((l) => /^\| \*\*Média\*\* \| Inventário completo/.test(l));
  assert.ok(media, 'a linha Média do Padrão de Qualidade sumiu');
  assert.doesNotMatch(media, /stub navegável/);
  assert.doesNotMatch(media, /rota \+ título \+ esqueleto/);
  assert.match(media, /`Status: stub`/);
  assert.match(media, /sem escrever em `src\/`/);
});

test('item 5: a definição de `stub` deixa de prometer rota', () => {
  const t = skill('spec-prototype/SKILL.md');
  const def = t.split(/\r?\n/).find((l) => /^- \*\*Status:\*\* `gerada`/.test(l));
  assert.ok(def);
  assert.doesNotMatch(def, /rota existe/);
  assert.match(def, /`stub` \(listada no Inventário, sem código/);
});

test('item 5: MEDIA_FIDELITY_NO_STUB cobra presença na tabela, não rota na navegação', () => {
  const t = skill('spec-prototype/SKILL.md');
  const v = t.split(/\r?\n/).find((l) => /^\| `MEDIA_FIDELITY_NO_STUB` \|/.test(l));
  assert.ok(v);
  assert.doesNotMatch(v, /rota inexistente/);
  assert.match(v, /ausente da tabela do Inventário/);
});

test('item 5: o lado que venceu continua lá — Média é "sem src/" nas três linhas originais', () => {
  const t = skill('spec-prototype/SKILL.md');
  assert.match(t, /^\| \*\*Média \(Figma \/ mockup\)\*\* \|.*sem `src\/` \|$/m);
  assert.match(t, /^\[ \] Média — prototype\.md com referências a frames \(Figma\/mockup\); sem código em src\//m);
  assert.match(t, /^Se \*\*média\*\*:.*sem escrever em `src\/`\.$/m);
});

// ————————————————————————————— Item 10 da §8: o cabeçalho da Âncora —————————————————————————————

const CABECALHO_NOVO = 'Âncora (§ + ID da fonte / minuto)';

test('item 10: o template do context-map deixa de oferecer âncora por linha', () => {
  const t = skill('spec-ingest/templates/context-map.md');
  assert.doesNotMatch(t, /Âncora \(linha § \/ minuto\)/);
  assert.match(t, new RegExp(CABECALHO_NOVO.replace(/[()+/]/g, '\\$&')));
});

test('item 10: a skill concorda com o template — mesma tabela, e o exemplo não ancora por linha', () => {
  const t = skill('spec-ingest/SKILL.md');
  assert.doesNotMatch(t, /Âncora \(linha § \/ minuto\)/);
  assert.match(t, new RegExp(CABECALHO_NOVO.replace(/[()+/]/g, '\\$&')));
  assert.doesNotMatch(t, /Âncora: `reuniao-01\.txt` L124–126/, 'o exemplo ainda ensina âncora por linha');
});


// ————————————————————————— Plano K1, Task 7: spec-tech-rules ganha o ambiente kiro —————————————————————————

test('K1 Task 7: a spec-tech-rules conhece o ambiente kiro — às duas pontas', () => {
  const t = skill('spec-tech-rules/SKILL.md').replace(/\r\n/g, '\n');
  // A pergunta do PASSO 1.0 tem quatro opções, e a quarta é o Kiro.
  assert.match(t, /^\s+4\. Kiro\s+→ gero só \.kiro\/steering\/\*\.md\s+\(inclusion \/ fileMatchPattern\)/m);
  assert.match(t, /ambiente ∈ \{cursor, claude, kiro, ambos\}/);
  // A tabela "Onde salvar" tem a linha do kiro.
  assert.match(t, /^\| `kiro` \| `outputs\/spec\/tech-rules\/\*\.mdc` \| `\.kiro\/steering\/` \| `\*\.md` \(converter frontmatter — `--kiro`\) \|/m);
  // A conversão está documentada com o comando.
  assert.match(t, /python3 tools\/mdc_to_md\.py --kiro --dir <pasta_mdc> \.kiro\/steering/);
  // A OUTRA PONTA: a redação antiga de três opções sumiu.
  assert.ok(!/ambiente ∈ \{cursor, claude, ambos\}/.test(t));
  // Pedágio da Decisão 45 (4.3 em 2026-10-19: o conversor ganhou chaves, `auto` e orçamento;
  // 4.4 em 2026-10-20: o check-rules.mjs do plano de melhoria das skills, Onda 3).
  assert.match(t, /^version: "4\.4"/m);
  assert.ok(!/^updated: "2026-08-24"/m.test(t));
  // O sumário do PASSO 5 ("Como usar") também conhece o Kiro — recorta só essa região, porque
  // `.kiro/steering/*.md` já aparece em outros pontos do arquivo.
  const iniPasso5 = t.indexOf('## PASSO 5');
  const fimPasso5 = t.indexOf('## PASSO 6', iniPasso5 + 1);
  // M7 (revisão final): a âncora do PASSO 6 tem que existir e vir DEPOIS do PASSO 5 — senão o
  // slice abaixo (com `fimPasso5 < 0 ? undefined : fimPasso5`) silenciosamente alarga a região até
  // o fim do arquivo no dia em que alguém renomear o título do PASSO 6, e o teste continuaria
  // verde sem provar mais nada sobre o "Como usar" de verdade.
  assert.ok(fimPasso5 > iniPasso5, 'a âncora do PASSO 6 sumiu');
  const passo5 = t.slice(iniPasso5, fimPasso5 < 0 ? undefined : fimPasso5);
  assert.match(passo5, /\.kiro\/steering\/\*\.md/, 'o "Como usar" do PASSO 5 não cita o Kiro');
  assert.ok(
    !/`\.cursor\/rules\/\*\.mdc` e\/ou `\.claude\/rules\/\*\.md`\. Nada a copiar manualmente\./.test(passo5),
    'a redação antiga do item 1 (sem Kiro) ainda está lá'
  );
});

test('K1 Task 7: o mdc_to_md.py tem o modo --kiro, e ele produz inclusion/fileMatchPattern', () => {
  const py = skill('spec-tech-rules/tools/mdc_to_md.py');
  assert.match(py, /def convert_kiro\(text/);
  assert.match(py, /"--kiro"/);
  assert.match(py, /inclusion: fileMatch/);
  assert.match(py, /fileMatchPattern/);
  assert.match(py, /inclusion: always/);
});

// ————————————————————————— Revisão final (I4): PASSO 6 (sync-log) também conhece o kiro —————————————————————————

test('revisão final (I4): a linha de sync-log do PASSO 6 tem o kiro entre os ambientes possíveis', () => {
  const t = skill('spec-tech-rules/SKILL.md').replace(/\r\n/g, '\n');
  const iniPasso6 = t.indexOf('## PASSO 6');
  assert.ok(iniPasso6 > 0, 'o PASSO 6 sumiu');
  // O próximo título de nível 2 FORA de bloco cercado — não há ``` dentro do PASSO 6 nesta skill,
  // então o índice cru já é seguro; se um dia entrar um bloco cercado aqui, esta busca precisa
  // saber pular por cima dele.
  const fimPasso6 = t.indexOf('\n## ', iniPasso6 + 1);
  assert.ok(fimPasso6 > iniPasso6, 'a âncora depois do PASSO 6 sumiu');
  const passo6 = t.slice(iniPasso6, fimPasso6);
  assert.match(passo6, /ambiente=\[cursor\|claude\|kiro\|ambos\]/, 'a linha de sync-log não lista o kiro');
  assert.ok(!/ambiente=\[cursor\|claude\|ambos\]/.test(passo6), 'a redação antiga de três ambientes ainda está lá');
  // Pedágio da Decisão 45 não muda por causa deste achado (a 4.3 veio do conversor, 2026-10-19; a
  // 4.4, do check-rules.mjs, 2026-10-20).
  assert.match(t, /^version: "4\.4"/m);
  assert.match(t, /^updated: "2026-10-20"/m);
});
