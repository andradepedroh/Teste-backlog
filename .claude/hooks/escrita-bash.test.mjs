import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';

import {
  alvosDoComando, avaliarComando, avaliar, GIT_SO_LEITURA, ARVORE_INTEIRA, ESCRITORES_IN_PLACE,
  COPIADORES,
} from './escrita-bash.mjs';
import * as mod from './escrita-bash.mjs';
import { criarRegistro, despachar, REGISTRO, IO_REAL } from './pretooluse.mjs';
import { relativizar, MARCADOR_CONGELAMENTO } from './kit.mjs';
import { paragrafoDoMaquinario, paragrafoDoMarcador } from './zonas.mjs';

// A raiz precisa ser um absoluto de VERDADE: `segmentarComando` resolve os `cd` com
// `path.resolve`, e comparar `C:\proj\CLAUDE.md` com a string `/proj` não casaria nunca.
const RAIZ = resolve('/proj');

/**
 * Casca falsa — a MESMA forma que o `criarRegistro` do pretooluse recebe (`cwd`, `relativizar`,
 * `exploreCongelado`, `lerDiretorio`). `chamadas` registra o que foi ao disco: a trava não pode
 * consultar o marcador de congelamento — nem resolver a raiz dos artefatos — em comando que nem
 * menciona o Explore.
 *
 * O `lerDiretorio` ENTROU com o conserto da cegueira multi-repo: a trava resolve a raiz dos
 * artefatos pelo `descobrirWorkspace` antes de julgar congelamento. A dublê levanta `ENOENT`, que o
 * `descobrirWorkspace` lê como "nada existe → mono-repo" — é o layout que esta dublê modela, e é o
 * que mantém o veredito de mono-repo verificável sem tocar o disco. Fornecê-lo IMPORTA: sem ele o
 * `descobrirWorkspace` cairia no `readdirSync` default e leria o disco de verdade sobre uma raiz
 * (`/proj`) que não existe. O multi-repo é exercitado com disco real, no bloco do fim do arquivo.
 */
function ioFalso(opcoes = {}) {
  const chamadas = [];
  return {
    chamadas,
    cwd: () => RAIZ,
    relativizar: (raiz, bruto) => relativizar(raiz, bruto),
    exploreCongelado: (raiz) => {
      chamadas.push(['exploreCongelado', raiz]);
      return opcoes.congelado === true;
    },
    // Decisão 40. Registra em `chamadas` pela MESMA razão que o `exploreCongelado`: a resposta custa
    // um `existsSync`, e o que os testes prendem é que ela só é paga dentro do deny por zona.
    ehTemplate: (raiz) => {
      chamadas.push(['ehTemplate', raiz]);
      return opcoes.template === true;
    },
    // A extensão do projeto (agente/skill próprios) só existe com manifesto: a dublê o entrega
    // quando o teste pede, e registra a leitura — ela também só pode ser paga dentro do deny.
    manifestoDaZona: (raiz) => {
      chamadas.push(['manifestoDaZona', raiz]);
      return opcoes.manifesto || null;
    },
    lerDiretorio: (dir) => {
      chamadas.push(['lerDiretorio', dir]);
      const erro = new Error(`ENOENT: ${dir}`); erro.code = 'ENOENT'; throw erro;
    },
  };
}

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const decidir = (command, opcoes) => despachar(bash(command), criarRegistro(ioFalso(opcoes)));

// ————————————————————————————— os casos que NEGAM —————————————————————————————
//
// A tabela da Task 2B, verificada antes desta trava existir: os doze passavam.

const NEGAM = [
  ['echo pwned > CLAUDE.md', /zona imutável/i, 'redireção para caminho protegido'],
  ['echo x >> .claude/settings.json', /zona imutável/i, 'idem, append'],
  [`sed -i 's/a/b/' .claude/hooks/kit.mjs`, /zona imutável/i, 'sed não é leitura'],
  ['rm -rf outputs/explore', /congelad/i, 'rm não é leitura'],
  ['mv CLAUDE.md antigo.md', /zona imutável/i, 'origem protegida'],
  ['cp novo.md CLAUDE.md', /zona imutável/i, 'destino protegido'],
  ['tee CLAUDE.md < x', /zona imutável/i, 'tee não é leitura'],
  ['git checkout -- .claude/hooks/kit.mjs', /zona imutável/i, 'subcomando de git que escreve'],
  ['cat x > .claude/hooks/kit.mjs', /zona imutável/i, 'comando lê, mas a REDIREÇÃO escreve'],
  ['sed -i s/a/b/ outputs/explore/gaps.md', /congelad/i, 'Explore congelado'],
  ['cd .claude/hooks && sed -i s/a/b/ kit.mjs', /zona imutável/i, 'cd seguido: o alvo é a zona imutável'],
  ['cd outputs && rm -rf explore', /congelad/i, 'idem, pelo cd'],
  ['dd if=/dev/zero of=CLAUDE.md', /zona imutável/i, 'operando `chave=caminho`'],
  ['curl --output=CLAUDE.md http://exemplo', /zona imutável/i, 'opção longa com `=`'],

  // ——— F1: `find` saiu de SO_LEITURA. Ele é lançador (`-delete`, `-exec`), não leitor ———
  ['find .claude/hooks -delete', /zona imutável/i, 'find apaga; não é leitura'],
  ['find outputs/explore -exec rm {} ;', /congelad/i, 'find -exec lança programa arbitrário'],

  // ——— F2: o alvo que CONTÉM caminho protegido, sem nomear nenhum ———
  // Os quatro primeiros foram medidos ANTES desta rodada e devolviam `allow`.
  ['rm -rf .', /zona imutável/i, 'a raiz contém a zona imutável inteira'],
  ['rm -rf ./', /zona imutável/i, 'idem, com barra'],
  ['rm -rf *', /zona imutável/i, 'o glob nomeia tudo que está no diretório'],
  // `proj` é o basename da RAIZ deste arquivo de teste — é o `cd .. && rm -rf <projeto>` do briefing.
  ['cd .. && rm -rf proj', /zona imutável/i, 'a raiz do projeto nomeada de fora'],
  ['rm -rf .claude', /zona imutável/i, '.claude contém .claude/hooks/'],
  ['rmdir outputs/explore', /congelad/i, 'rmdir remove a árvore'],
  ['rm -rf outputs', /congelad/i, 'outputs contém o Explore congelado'],
  ['mv . ../outro', /zona imutável/i, 'mover a árvore é removê-la de onde ela estava'],
  ['find . -name "*.mjs" -delete', /zona imutável/i, 'F1 e F2 juntos: find desce na raiz e apaga'],

  // ——— Sondados por mim, além do briefing: o glob fecha a família inteira, não só o `rm` ———
  // O cabeçalho deste arquivo diz que `sed -i` no arquivo errado é o acidente-alvo. `sed -i ... *`
  // na raiz reescreve o CLAUDE.md e passava.
  [`sed -i 's/a/b/' *`, /zona imutável/i, 'sed -i sobre o glob da raiz'],
  ['truncate -s 0 *', /zona imutável/i, 'truncate sobre o glob da raiz'],
  ['shred -u *', /zona imutável/i, 'shred sobre o glob da raiz'],
  ['rm -rf .claude/*', /zona imutável/i, 'glob dentro de diretório que contém maquinário'],


  // ——— As outras formas de "o diretório inteiro". Só o `*` cru estava coberto, e a tabela de
  // mutação da rodada G mediu o custo: estreitar `ehSegmentoTudo` para `/^[*?]$/` deixava a
  // suíte inteira verde. O comentário do regex afirma que "tirar qualquer pedaço derruba um
  // teste" — afirmação medida e FALSA antes destas três linhas. `.*` é o caso que mais importa:
  // na raiz do projeto, os ocultos são `.claude/` e `.git/`.
  ['rm -rf .*', /zona imutável/i, 'o glob dos ocultos alcança a raiz inteira'],
  ['rm -rf **', /zona imutável/i, 'o glob duplo também é o diretório inteiro'],
  ['rm -rf ?', /zona imutável/i, 'o coringa de um caractere, sozinho, também é o diretório'],

  // ——— Posição de escrita: uma por porta do desenho novo (G1) ———
  ['cat > CLAUDE.md <<EOF\ntexto\nEOF', /zona imutável/i, 'o heredoc não esconde o alvo da redireção'],
  ['for f in a b; do rm -rf .claude/hooks; done', /zona imutável/i, 'pular a palavra-chave não esconde o `rm`'],
  ['RM -rf .claude/hooks', /zona imutável/i, 'o nome do comando é lido sem caixa'],
  ['chmod -R 777 .claude/hooks', /zona imutável/i, 'escritor in-place: o caminho nomeado É o alvo'],
  ['chown user .claude/settings.json', /zona imutável/i, 'idem'],
  ['tee -a CLAUDE.md < x', /zona imutável/i, 'idem'],
  ['install -m 644 novo.md CLAUDE.md', /zona imutável/i, 'destino de `install`'],
  ['ln -sf novo.md CLAUDE.md', /zona imutável/i, 'destino de `ln`'],
  ['sed --in-place=.bak s/a/b/ CLAUDE.md', /zona imutável/i, '`--in-place` também é `sed -i`'],
  ['sed -ni s/a/b/ CLAUDE.md', /zona imutável/i, 'e o `-i` colado em outras opções curtas'],
  ['git diff --output CLAUDE.md', /zona imutável/i, 'opção que NOMEIA o arquivo escrito'],
  ['curl --output CLAUDE.md http://exemplo', /zona imutável/i, 'idem, na forma com espaço'],
  ['cp .claude/templates/hld.md CLAUDE.md', /zona imutável/i, 'origem livre, destino protegido'],

  // ——— G4: destruição catastrófica ———
  ['rm -rf .git', /histórico/i, 'perder o histórico é irreversível'],
  ['rm -rf .git/objects', /histórico/i, 'inclusive um pedaço dele'],
  ['echo x > .git/config', /histórico/i, 'e a redireção também'],
  ['cd .git && rm -rf objects', /histórico/i, 'idem, pelo cd'],
];

for (const [comando, esperado, porque] of NEGAM) {
  test(`nega — ${comando}  (${porque})`, () => {
    const r = decidir(comando, { congelado: true });
    assert.equal(r.acao, 'deny', `deveria negar: ${comando}`);
    assert.match(r.motivo, esperado);
  });
}

// ————————————————————————————— os casos que LIBERAM —————————————————————————————
//
// Não são enfeite: sem eles, um verificador que nega tudo passa na tabela de deny. Todos rodam com
// o Explore CONGELADO, o estado mais restritivo — se passam aqui, passam sempre.

const LIBERAM = [
  ['cat CLAUDE.md', 'leitura pura'],
  ['grep -rn "kit" .claude/hooks/', 'leitura'],
  ['git log --oneline -5', 'subcomando de leitura'],
  ['git diff .claude/hooks/kit.mjs', 'subcomando de leitura, com caminho protegido'],
  ['node .claude/hooks/revisao.mjs', 'uso normal do harness'],
  ['node --test .claude/hooks/*.test.mjs', 'uso normal do harness'],
  ['rm -rf outputs/spec/rascunho.md', 'caminho NÃO protegido'],
  ['echo x > outputs/spec/notas.md', 'zona mutável'],
  ['npm run build', 'não menciona caminho protegido'],
  ['sed -i s/a/b/ src/app.ts', 'zona mutável'],
  ['cd outputs/spec && rm rascunho.md', 'cd seguido, destino não protegido'],
  ['grep --include=*.mjs -rn "kit" .claude/hooks/', 'o `=` não transforma leitura em escrita'],
  ['git log --format=%H -- .claude/hooks/kit.mjs', 'idem, em subcomando de leitura do git'],

  // ——— F2: a metade que impede a contenção de virar "nega tudo" ———
  // Copiar PARA DENTRO de um diretório não destrói o que está lá. Se este caso ficar vermelho, a
  // contenção passou a valer para todo comando e trocou um buraco raro por um falso positivo
  // diário — que é exatamente a troca que o modelo de ameaça proíbe.
  ['cp relatorio.md .', 'copiar para dentro da raiz não destrói a raiz'],
  ['cp x outputs/spec/', 'destino na zona mutável'],
  ['rm -rf build', 'árvore que não contém nada protegido'],
  ['cd src && rm -rf dist', 'idem, pelo cd'],
  ['mv src/a.ts src/b.ts', 'renomear dentro da zona mutável'],
  ['ls .claude/hooks/', 'leitura'],

  // ——— Legítimos que sondei além do briefing ———
  ['rm -rf node_modules', 'a árvore mais apagada de todas'],
  ['rm *.log', 'glob PARCIAL é nome literal, não "tudo que está aqui"'],
  ['cd outputs/spec && rm -rf *', 'glob num diretório que não contém nada protegido'],
  ['find outputs/spec -name "*.md"', 'find fora de caminho protegido continua passando'],
  ['mv outputs/spec/rascunho.md ./rascunho.md', 'destino NOMEADO na raiz não é a raiz'],
  ['tar -czf backup.tgz outputs/spec', 'diretório como ORIGEM de leitura, sem destruição'],
  ['rm -rf outputs/spec/auditorias', 'subárvore da zona mutável'],

  // ————————————————————————————————————————————————————————————————————————————————
  // G1 — MENÇÃO NÃO É ESCRITA. Os 24 falsos positivos que a revisão adversarial achou
  // sondando 263 comandos. TODOS negavam antes desta rodada, e cada um deles é trabalho
  // legítimo: uma trava que nega o dia a dia é desligada na primeira semana, e trava
  // desligada protege zero.
  // ————————————————————————————————————————————————————————————————————————————————

  // 1. aridade — o `cp` só LÊ a origem, e o `mv` só DESTRÓI a origem
  ['cp .claude/templates/hld.md outputs/spec/hld.md', 'origem protegida, destino livre'],
  ['cp -r outputs/explore outputs/backup-explore', 'copiar o Explore congelado para fora dele'],
  ['mv relatorio.md outputs/', 'mover PARA DENTRO de um diretório não o destrói'],
  ['mv relatorio.md .', 'idem, para a raiz do projeto'],
  ['cp * outputs/', 'o glob é a ORIGEM da cópia'],

  // 2. palavra-chave de shell tratada como nome de comando
  ['for f in .claude/hooks/*.test.mjs; do node --test "$f"; done', '`for` não é comando'],
  ['for f in outputs/explore/*.md; do echo "$f"; done', 'idem, no Explore congelado'],
  ['if [ -f CLAUDE.md ]; then echo existe; fi', '`if` e `[` não são comandos'],
  ['test -f .claude/settings.json && echo ok', '`test` só pergunta'],
  ['[ -d .claude/hooks ] && echo ok', 'idem'],
  ['while read l; do echo "$l"; done < outputs/explore/gaps.md', '`done` não é comando, e `<` LÊ'],

  // 3. leitor que não estava na lista de leitura — a lista que nunca fechava
  [`jq '.hooks' .claude/settings.json`, 'jq lê'],
  [`awk '{print $1}' outputs/explore/gaps.md`, 'awk lê'],
  ['sort outputs/explore/gaps.md | uniq', 'sort lê'],
  ['du -sh .claude/hooks', 'du lê'],
  ['basename .claude/hooks/kit.mjs', 'basename nem abre o arquivo'],
  ['dirname .claude/hooks/kit.mjs', 'idem'],
  ['realpath CLAUDE.md', 'idem'],
  ['bat CLAUDE.md', 'bat lê'],
  [`sed -n '1,50p' .claude/hooks/kit.mjs`, '`sed` SEM `-i` não escreve em arquivo nenhum'],
  ['npx prettier --check .claude/hooks/kit.mjs', '`--check` não escreve'],
  ['source .claude/hooks/env.sh', 'carregar um script é lê-lo'],
  ['git grep -n "RF-" outputs/explore', '`git grep` lê'],
  ['git commit -m "ajusta .claude/hooks/kit.mjs conforme revisao"', 'a mensagem de commit é prosa'],

  // 4. comentário e prosa — `#`, `*` e `?` soltos no meio do texto
  ['npm run build # nao rode rm -rf .claude/hooks', 'depois do `#` é comentário'],
  ['npm run build -- *', 'o glob é ARGUMENTO, não alvo de escrita'],
  ['zip -r backup.zip *', 'o glob é a origem do zip'],
  ['tar --exclude=CLAUDE.md -czf b.tgz src', '`--exclude` nomeia o que NÃO entra'],
  ['npm run build -- --define:X=?', 'um `?` numa opção não é glob de diretório'],
];

for (const [comando, porque] of LIBERAM) {
  test(`libera — ${comando}  (${porque})`, () => {
    const r = decidir(comando, { congelado: true });
    assert.equal(r.acao, 'allow', `deveria liberar: ${comando}${r.motivo ? '\n' + r.motivo : ''}`);
    assert.deepEqual(r.falhas, []);
  });
}

// ——— G1, os casos que precisam de mais de uma linha ou de mais de um estado ———

test('G1 — o PRIMEIRO PASSO do fluxo passa: copiar o template para outputs/explore/', () => {
  // `.claude/rules/harness/explore.md` PRESCREVE isto: "Os templates estão em `.claude/templates/`.
  // Copie para `outputs/explore/` e preencha." A trava negava o dia 1 do Explore, com uma mensagem
  // que mandava fazer o oposto ("mude o maquinário no template"). Era o pior falso positivo dos 24.
  const cmd = 'cp .claude/templates/hld-funcional.md outputs/explore/hld-funcional.md';
  assert.equal(decidir(cmd, { congelado: false }).acao, 'allow');
  // E continua negando depois do congelamento — aí o DESTINO é que está protegido, não a origem.
  assert.equal(decidir(cmd, { congelado: true }).acao, 'deny');
});

test('G1 — o CORPO de um heredoc é texto do documento, não comando', () => {
  const comCaminho = [
    "cat > outputs/spec/nota.md <<'EOF'",
    'Veja .claude/hooks/kit.mjs para os detalhes',
    'e cuidado com rm -rf .claude/hooks',
    'EOF',
  ].join('\n');
  assert.equal(decidir(comCaminho, { congelado: true }).acao, 'allow');

  const comGlob = ['cat > outputs/spec/lista.md <<\'EOF\'', 'Itens:', '- segundo item *', 'EOF'].join('\n');
  assert.equal(decidir(comGlob, { congelado: true }).acao, 'allow');

  const comPergunta = ["cat >> outputs/spec/pergunta.md <<'EOF'", 'Qual e o prazo ?', 'EOF'].join('\n');
  assert.equal(decidir(comPergunta, { congelado: true }).acao, 'allow');
});

test('G1 — mas o ALVO da redireção do heredoc continua sendo julgado', () => {
  const r = decidir(["cat > outputs/explore/gaps.md <<'EOF'", 'texto', 'EOF'].join('\n'), { congelado: true });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /congelad/i);
});

// ————————————————————————————— o núcleo, peça por peça —————————————————————————————

test('alvosDoComando: devolve POSIÇÕES DE ESCRITA — quem só é mencionado não aparece', () => {
  // A inversão de polaridade desta rodada, num assert: `cat a.md > b.md` menciona dois caminhos e
  // escreve em um. Antes, os dois viravam alvo e um deles era perdoado depois, por lista de
  // comandos de leitura; agora só existe o que está em posição de escrita.
  const alvos = alvosDoComando('cat a.md > b.md');
  assert.deepEqual(alvos.map((a) => [a.token, a.tipo]), [['b.md', 'redirecao']]);
  assert.deepEqual(alvosDoComando('cat a.md b.md'), [], 'ler dois arquivos não é escrever em nenhum');
});

test('alvosDoComando: `>>` também é alvo de redireção, e a redireção independe do comando', () => {
  assert.deepEqual(alvosDoComando('echo x >> b.md').map((a) => a.token), ['b.md']);
  assert.deepEqual(alvosDoComando('node -e "1" > b.md').map((a) => a.token), ['b.md']);
});

test('alvosDoComando: `<` e `<<` LEEM — nem o token seguinte nem o delimitador são alvo', () => {
  assert.deepEqual(alvosDoComando('tee f.md < entrada.md').map((a) => a.token), ['f.md']);
  assert.deepEqual(alvosDoComando('cat <<EOF\ntexto\nEOF').map((a) => a.token), []);
});

test('alvosDoComando: a opção que NOMEIA o arquivo escrito é posição de escrita', () => {
  // `dd if=/dev/zero of=CLAUDE.md` LIBERAVA — medido. A regra não pergunta que comando é: `of=`,
  // `--output=` e `--output <arquivo>` dizem, no próprio nome, onde a saída vai parar.
  for (const cmd of ['dd if=/dev/zero of=CLAUDE.md', 'curl --output=CLAUDE.md http://x',
    'git diff --output CLAUDE.md']) {
    assert.deepEqual(alvosDoComando(cmd).map((a) => a.token), ['CLAUDE.md'], cmd);
  }
  // E o que NÃO nomeia saída continua sendo menção livre.
  assert.deepEqual(alvosDoComando('tar --exclude=CLAUDE.md -czf b.tgz src'), []);
});

test('alvosDoComando: o nome do comando não vira alvo, e as opções também não', () => {
  const alvos = alvosDoComando('rm -rf outputs/spec/x.md');
  assert.deepEqual(alvos.map((a) => a.token), ['outputs/spec/x.md']);
  assert.equal(alvos[0].comando, 'rm');
  assert.equal(alvos[0].tipo, 'arvore');
});

test('alvosDoComando: em `cp`/`mv`/`install`/`ln`, o ÚLTIMO argumento é o DESTINO', () => {
  // A convenção de shell mais estável que existe, e a que separa "o comando lê isto" de "o
  // comando escreve nisto". É ela que faz o primeiro passo do Explore passar.
  const cp = alvosDoComando('cp origem.md destino.md');
  assert.deepEqual(cp.map((a) => [a.token, a.tipo]), [['destino.md', 'destino']]);

  // Em `mv`, a origem NÃO é livre: ela é levada embora, e por isso continua sendo árvore.
  const mv = alvosDoComando('mv origem.md destino.md');
  assert.deepEqual(mv.map((a) => [a.token, a.tipo]), [['origem.md', 'arvore'], ['destino.md', 'destino']]);
});

test('alvosDoComando: `sed` só é escritor com `-i` — sem ele, não escreve em arquivo nenhum', () => {
  // O script (`s/a/b/`) também entra como candidato: a trava não sabe a aridade do `sed`, e um
  // token que não é caminho simplesmente não casa nada. Errar assim é conservador e barato.
  const comI = alvosDoComando('sed -i s/a/b/ alvo.md');
  assert.ok(comI.some((a) => a.token === 'alvo.md' && a.tipo === 'in-place'), JSON.stringify(comI));
  assert.deepEqual(alvosDoComando(`sed -n '1,50p' alvo.md`), []);
  assert.deepEqual(alvosDoComando('perl -pi -e s/a/b/ alvo.md').filter((a) => a.token === 'alvo.md').length, 1);
  assert.deepEqual(alvosDoComando('perl -Ilib script.pl'), [], '`-I` maiúsculo é include, não in-place');
});

test('alvosDoComando: `cd` anterior entra no caminho do alvo', () => {
  const alvos = alvosDoComando('cd .claude/hooks && sed -i s/a/b/ kit.mjs', { raiz: RAIZ });
  const alvo = alvos.find((a) => a.token === 'kit.mjs');
  assert.equal(relativizar(RAIZ, alvo.caminho), '.claude/hooks/kit.mjs');
});

test('alvosDoComando: `git -C <dir>` entra no caminho do alvo', () => {
  const alvos = alvosDoComando('git -C .claude/hooks checkout -- kit.mjs', { raiz: RAIZ });
  const alvo = alvos.find((a) => a.token === 'kit.mjs');
  assert.equal(relativizar(RAIZ, alvo.caminho), '.claude/hooks/kit.mjs');
  assert.equal(alvo.tipo, 'git');
});

test('alvosDoComando: subcomando de git que só LÊ não produz posição de escrita', () => {
  assert.deepEqual(alvosDoComando('git diff .claude/hooks/kit.mjs'), []);
  assert.deepEqual(alvosDoComando('git commit -m "toca .claude/hooks/kit.mjs"'), []);
  assert.deepEqual(alvosDoComando('git grep -n RF- outputs/explore'), []);
});

test('alvosDoComando: caminho do comando é reduzido ao nome — `/usr/bin/rm` é `rm`', () => {
  assert.equal(alvosDoComando('/usr/bin/rm CLAUDE.md')[0].comando, 'rm');
  // Com aspas, porque sem elas o espaço parte o token — e é isso que o bash faz também.
  assert.equal(alvosDoComando('"C:\\Program Files\\Git\\usr\\bin\\sed.exe" -i x CLAUDE.md')[0].comando, 'sed');
});

test('avaliarComando: o núcleo é puro — quem sabe o que é protegido é a função injetada', () => {
  const vistos = [];
  const protegido = (rel) => { vistos.push(rel); return rel === 'combinado.md' ? 'zona-imutavel' : null; };
  const r = avaliarComando('rm combinado.md', protegido, { raiz: RAIZ });
  assert.equal(r.acao, 'deny');
  assert.deepEqual(vistos, ['combinado.md']);
  assert.equal(avaliarComando('rm outro.md', protegido, { raiz: RAIZ }), null);
});

test('avaliarComando: comando que não escreve nem PERGUNTA se o caminho é protegido', () => {
  // A pergunta custa disco (o marcador de congelamento). Quem só menciona não pode pagar por isso
  // — e agora "quem só menciona" é a maioria esmagadora dos comandos, não uma lista fechada.
  let perguntas = 0;
  const protegido = () => { perguntas += 1; return 'zona-imutavel'; };
  for (const cmd of ['cat CLAUDE.md', 'jq . .claude/settings.json', 'du -sh .claude/hooks']) {
    assert.equal(avaliarComando(cmd, protegido, { raiz: RAIZ }), null, cmd);
  }
  assert.equal(perguntas, 0);
});

test('não existe mais lista de comandos de leitura — a de `git` ficou, e é a única', () => {
  // `SO_LEITURA` era a lista que decidia: o que não estivesse nela e MENCIONASSE caminho protegido
  // era negado. Ela foi removida com o desenho novo, e nada a substituiu: menção é livre.
  // A de `git` sobrevive porque `git` é um comando com dezenas de subcomandos, e a pergunta
  // "este subcomando reescreve a árvore de trabalho?" não tem resposta pela POSIÇÃO do argumento.
  assert.equal(mod.SO_LEITURA, undefined, 'SO_LEITURA não deve mais existir');
  assert.ok(GIT_SO_LEITURA.has('log'));
  assert.ok(GIT_SO_LEITURA.has('commit'), 'a mensagem de commit é prosa e cita caminho o tempo todo');
  assert.ok(GIT_SO_LEITURA.has('grep'), 'git grep lê');
  for (const sub of ['checkout', 'restore', 'reset', 'clean', 'apply', 'stash', 'rm', 'mv']) {
    assert.ok(!GIT_SO_LEITURA.has(sub), `git ${sub} NÃO pode ser reconhecido como leitura`);
  }
});

// ————————————————————————————— a contenção, peça por peça —————————————————————————————

test('a enumeração de comandos que alcançam a árvore inteira NÃO é vazia', () => {
  // Mutação alvo: esvaziar a lista transforma a contenção em no-op sem quebrar nada mais.
  for (const cmd of ['rm', 'rmdir', 'mv', 'find']) {
    assert.ok(ARVORE_INTEIRA.has(cmd), `${cmd} trata argumento de diretório como a árvore toda`);
  }
});

test('`cp` e os que ESCREVEM DENTRO ficam fora da enumeração — é o que salva `cp x .`', () => {
  for (const cmd of ['cp', 'tar', 'install', 'ln', 'tee', 'unzip']) {
    assert.ok(!ARVORE_INTEIRA.has(cmd), `${cmd} escreve DENTRO do diretório; não o destrói`);
  }
});

test('a enumeração de escritores in-place NÃO é vazia, e não inclui quem só lê', () => {
  for (const cmd of ['truncate', 'tee', 'shred', 'chmod', 'chown']) {
    assert.ok(ESCRITORES_IN_PLACE.has(cmd), `${cmd} escreve no caminho que nomeia`);
  }
  for (const cmd of ['cat', 'grep', 'jq', 'awk', 'sed', 'node', 'npx']) {
    assert.ok(!ESCRITORES_IN_PLACE.has(cmd), `${cmd} não escreve só por nomear um caminho`);
  }
});

test('contenção: a raiz é reconhecida mesmo quando `relativizar` devolve `null` para ela', () => {
  // ACHADO SONDANDO, e é falso negativo de produção, não detalhe: `relativizar` do kit devolve
  // `''` para a própria raiz, mas o `relativizarComRecuo` que o `IO_REAL` usa devolve `null`
  // — ele sobe de ancestral em ancestral e a raiz nunca é ancestral de si mesma. Medido:
  // `IO_REAL.relativizar(raiz, raiz) === null`. Uma contenção que só olhasse `rel === ''` ficaria
  // verde com o dublê deste arquivo e MORTA em produção, que é o pior resultado possível.
  const soIdentidade = (raiz, caminho) => (caminho === raiz ? null : relativizar(raiz, caminho));
  const protegido = (rel) => (rel === 'CLAUDE.md' ? 'zona-imutavel' : null);
  const r = avaliarComando('rm -rf .', protegido, { raiz: RAIZ, relativizar: soIdentidade });
  assert.ok(r && r.acao === 'deny', 'a raiz tem que ser reconhecida pelos DOIS resolvedores');
});

test('contenção: fora do projeto continua liberado — o harness não governa o disco inteiro', () => {
  const protegido = () => 'zona-imutavel';
  assert.equal(avaliarComando('rm -rf ../../outro', protegido, { raiz: RAIZ }), null);
});

test('contenção: a mensagem NOMEIA o protegido que está lá dentro', () => {
  const r = decidir('rm -rf .', { congelado: true });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /CLAUDE\.md/, 'a mensagem tem que dizer O QUE está dentro do alvo');
  assert.match(r.motivo, /alcança tudo que está em/, 'e que o problema é o alcance, não o nome');
  assert.match(r.motivo, /alvo exato/, 'e qual é a saída: estreitar o alvo');
});

test('contenção pelo congelamento: `rm -rf outputs` só nega com o Explore congelado', () => {
  // O caso que o briefing mandou decidir e justificar. `outputs` contém `outputs/explore/`, mas
  // o Explore só é protegido quando o marcador existe — a contenção reperunta ao MESMO oráculo,
  // então ela herda o congelamento em vez de duplicá-lo.
  assert.equal(decidir('rm -rf outputs', { congelado: true }).acao, 'deny');
  assert.equal(decidir('rm -rf outputs', { congelado: false }).acao, 'allow');
});

// ————————————————————————————— a casca e o wiring —————————————————————————————

test('avaliar: payload sem comando libera sem tocar em nada', () => {
  const io = ioFalso({ congelado: true });
  assert.equal(avaliar({ tool_name: 'Bash', tool_input: {} }, io), null);
  assert.equal(avaliar({ tool_name: 'Bash' }, io), null);
  assert.deepEqual(io.chamadas, []);
});

test('wiring — a entrada `escrita-bash` existe no REGISTRO, é bloqueante e só dispara em Bash', () => {
  const v = REGISTRO.find((x) => x.nome === 'escrita-bash');
  assert.ok(v, 'o REGISTRO precisa declarar a trava escrita-bash');
  assert.equal(v.bloqueia, true);
  assert.deepEqual(v.gatilhos, ['Bash']);
});

test('wiring — `escrita-bash` vem DEPOIS das travas de arquivo', () => {
  // As mensagens de zona-imutavel e congelamento são mais específicas quando a escrita vem por
  // tool de arquivo; esta é a rede de baixo.
  const nomes = REGISTRO.map((v) => v.nome);
  assert.ok(nomes.indexOf('escrita-bash') > nomes.indexOf('zona-imutavel'));
  assert.ok(nomes.indexOf('escrita-bash') > nomes.indexOf('congelamento'));
});

test('wiring — comando que não menciona o Explore NÃO consulta o marcador no disco', () => {
  const io = ioFalso({ congelado: true });
  const r = despachar(bash('rm -rf outputs/spec/rascunho.md'), criarRegistro(io));
  assert.equal(r.acao, 'allow');
  assert.deepEqual(io.chamadas, []);
});

test('wiring — o disco é consultado UMA vez por pergunta, na raiz certa, mesmo com vários alvos', () => {
  const io = ioFalso({ congelado: false });
  despachar(bash('rm outputs/explore/gaps.md outputs/explore/hld-funcional.md'), criarRegistro(io));
  // DOIS memos, um por pergunta: a raiz dos artefatos (`lerDiretorio`, via `descobrirWorkspace`) e
  // o marcador (`exploreCongelado`). Dois alvos do Explore no mesmo comando não podem virar quatro
  // idas ao disco — e em mono-repo a raiz dos artefatos é a `cwd`, que é a raiz que aparece aqui.
  assert.deepEqual(io.chamadas, [['lerDiretorio', RAIZ], ['exploreCongelado', RAIZ]]);
});

test('wiring — Explore NÃO congelado: escrita em outputs/explore/ passa (zona mutável)', () => {
  const r = decidir('sed -i s/a/b/ outputs/explore/gaps.md', { congelado: false });
  assert.equal(r.acao, 'allow');
});

test('wiring — bloqueante que lança vira deny, não liberação', () => {
  const erro = new Error('permission denied'); erro.code = 'EACCES';
  const io = { ...ioFalso(), exploreCongelado: () => { throw erro; } };
  const r = despachar(bash('rm -rf outputs/explore'), criarRegistro(io));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /falha do harness/i);
});

test('wiring — Write continua sendo julgado pelas travas de arquivo, não por esta', () => {
  const r = despachar(
    { tool_name: 'Write', tool_input: { file_path: `${RAIZ}/CLAUDE.md`, content: 'x' } },
    criarRegistro(ioFalso()),
  );
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /zona imutável/i);
});

test('a mensagem diz o comando, o caminho e o que fazer', () => {
  const r = decidir(`sed -i 's/a/b/' .claude/hooks/kit.mjs`);
  assert.match(r.motivo, /sed/);
  assert.match(r.motivo, /\.claude\/hooks\/kit\.mjs/);
  assert.match(r.motivo, /Read/); // como LER o arquivo
  assert.match(r.motivo, /template/i); // onde a mudança de maquinário vai
});

test('a mensagem do congelamento aponta o marcador como saída', () => {
  const r = decidir('rm -rf outputs/explore', { congelado: true });
  assert.match(r.motivo, /_explore-congelado\.md/);
});

test('a mensagem do `.git` é própria — não fala de template nem de congelamento', () => {
  // A semântica de `ZONA_IMUTAVEL` é "maquinário atualizado por sobrescrita", e a mensagem de lá
  // manda a mudança para o template. Dizer isso sobre o histórico do repositório mandaria o
  // consultor fazer algo que não existe.
  const r = decidir('rm -rf .git', { congelado: true });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /histórico/i);
  assert.doesNotMatch(r.motivo, /template/i);
  assert.doesNotMatch(r.motivo, /congelad/i);
  assert.match(r.motivo, /terminal/i, 'a saída existe e é fora do agente');
});

test('a mensagem nomeia como comando só o que É comando', () => {
  // Antes desta rodada a trava dizia "`done` toca outputs/explore/gaps.md" e "`qual ?` alcança
  // tudo que está em `.`" — nomeando como comando uma palavra-chave e uma palavra de prosa.
  // Agora só quem está em posição de escrita produz mensagem, e o nome vem do comando do segmento.
  const r = decidir('for f in a b; do rm -rf .claude/hooks; done', { congelado: true });
  assert.match(r.motivo, /`rm/);
  assert.doesNotMatch(r.motivo, /`(for|do|done)[ `]/);
});

test('sondado além da revisão: `rsync` tem a mesma convenção origem→destino', () => {
  // Achado sondando 60 comandos legítimos meus: `rsync -av novo/ .claude/hooks/` LIBERAVA. Ele é
  // `cp` com outro nome, e a aridade dele é idêntica.
  assert.equal(decidir('rsync -av novo/ .claude/hooks/', { congelado: true }).acao, 'deny');
  assert.equal(decidir('rsync -av .claude/templates/ outputs/spec/tpl/', { congelado: true }).acao, 'allow');
});

test('sondado além da revisão: em `find`, só os CAMINHOS antes da expressão são alvo', () => {
  // `find src -name "*.ts" -newer .claude/hooks/kit.mjs` NEGAVA: o arquivo de referência do
  // `-newer` — que o find só LÊ — era lido como se fosse uma raiz de busca. A gramática do find é
  // `find [caminhos…] [expressão]`, e a expressão começa no primeiro `-algo`.
  assert.equal(decidir('find src -name "*.ts" -newer .claude/hooks/kit.mjs', { congelado: true }).acao, 'allow');
  assert.equal(decidir('find outputs/spec -path .claude/hooks -prune', { congelado: true }).acao, 'allow');
  // E as raízes continuam sendo raízes.
  assert.equal(decidir('find .claude/templates -name "*.md" -delete', { congelado: true }).acao, 'deny');
  assert.equal(decidir('find . -type f -exec rm {} ;', { congelado: true }).acao, 'deny');
});

test('COPIADORES declara quem tem destino no último argumento, e não vaza para quem não tem', () => {
  for (const cmd of ['cp', 'mv', 'install', 'ln', 'rsync']) {
    assert.ok(COPIADORES.has(cmd), `${cmd} escreve no ÚLTIMO argumento`);
  }
  for (const cmd of ['rm', 'rmdir', 'find', 'tar', 'zip', 'cat']) {
    assert.ok(!COPIADORES.has(cmd), `${cmd} não tem a convenção origem→destino`);
  }
});

// ————————————————————————————— o que a trava NÃO promete —————————————————————————————

test('limitação declarada: substituição de variável e de comando passam', () => {
  // Interpretar shell no hook é reimplementar o bash, e o modelo de ameaça é ACIDENTE, não
  // adversário. Este teste existe para que a limitação seja visível, não para celebrá-la: se
  // alguém um dia fechar isso, ele fica vermelho e a decisão volta à mesa.
  assert.equal(decidir('ALVO=CLAUDE.md; rm $ALVO', { congelado: true }).acao, 'allow');
  assert.equal(decidir('rm $(echo CLAUDE.md)', { congelado: true }).acao, 'allow');
});

test('limitação declarada: `cd` não literal deixa o segmento no diretório anterior', () => {
  assert.equal(decidir('cd $DIR && rm kit.mjs', { congelado: true }).acao, 'allow');
});

test('falso positivo declarado: `find <dir>` continua sendo tratado como a árvore inteira', () => {
  // `find` é LANÇADOR (`-delete`, `-exec`, `-execdir`, `-ok`, `-fprintf`) e está em
  // `ARVORE_INTEIRA`. O preço é que `find . -name x` na raiz e `find outputs -name x` com o
  // Explore congelado são negados, apesar de só lerem. Distinguir os dois exigiria a lista de
  // exclusão POR FLAG — a que nunca fecha, e a que deixou `dd of=` passar por três rodadas.
  // Saída: `find src -name x`, `rg --files`, ou a tool Glob. Este é o falso positivo mais caro
  // que sobrevive a esta rodada, e é o primeiro candidato a voltar à mesa.
  assert.equal(decidir('find . -name "*.test.mjs"', { congelado: true }).acao, 'deny');
  assert.equal(decidir('find outputs -name "*.md"', { congelado: true }).acao, 'deny');
  assert.equal(decidir('find outputs -name "*.md"', { congelado: false }).acao, 'allow');
});

// ————————————————— os FALSOS NEGATIVOS que o desenho novo assume —————————————————
//
// Este bloco é o PREÇO da inversão de polaridade, e ele está escrito como teste porque preço
// que não é verificado vira surpresa. Cada linha aqui LIBERA hoje, e liberava por decisão, não
// por descuido: fechá-la exigiria saber o que um programa arbitrário faz com o caminho que
// recebe — que é a lista que nunca fecha, e cujo custo agora é falso positivo diário.
//
// O que segura estes casos NÃO é esta trava: é a trava de `Write`/`Edit`/`NotebookEdit`, que
// cobre a escrita que o agente faz por tool, e o `git` — o maquinário do template é versionado.

test('falso negativo declarado: lançador de programa com caminho protegido LIBERA', () => {
  // O mais doloroso da rodada, e ele merece o nome: `npx prettier --write .claude/hooks/` é o
  // acidente que o cabeçalho deste arquivo dizia existir para pegar, e ele passa. A alternativa
  // era continuar negando `npx prettier --check .claude/hooks/kit.mjs`, `code arquivo.md` e
  // `npx eslint --fix` sobre a zona mutável — e uma trava que nega o dia a dia é desligada.
  for (const cmd of ['npx prettier --write .claude/hooks/', 'npx prettier --write *',
    'code .claude/hooks/kit.mjs', 'vim outputs/explore/gaps.md', 'nano CLAUDE.md']) {
    assert.equal(decidir(cmd, { congelado: true }).acao, 'allow', cmd);
  }
});

test('falso negativo declarado: criar DIRETÓRIO novo dentro de zona protegida LIBERA', () => {
  // `mkdir` não destrói nem sobrescreve nada: ele cria. Sob o modelo de ACIDENTE o dano é zero, e
  // escrever CONTEÚDO no que foi criado continua sendo negado — por redireção, por destino de
  // `cp`, ou pela trava de `Write`. A exceção é o marcador do template, que é chave (ver abaixo).
  // `touch` SAIU desta lista: criar o marcador com ele destravava a zona (Decisão 67).
  assert.equal(decidir('mkdir outputs/explore/novo', { congelado: true }).acao, 'allow');
  assert.equal(decidir('touch CLAUDE.md', { congelado: true }).acao, 'deny');
  assert.equal(decidir('echo x > outputs/explore/novo/a.md', { congelado: true }).acao, 'deny');
});

test('falso negativo declarado: extrair arquivo sobre a árvore LIBERA', () => {
  // `tar -xzf x.tgz -C .` e `unzip -o x.zip -d .` podem sobrescrever qualquer coisa, e o que eles
  // escrevem não está no comando — está dentro do arquivo compactado. Já liberavam antes desta
  // rodada; ficam registrados porque agora a lista de escritores é explícita e alguém vai
  // perguntar por que estes não estão nela.
  assert.equal(decidir('tar -xzf x.tgz -C .', { congelado: true }).acao, 'allow');
  assert.equal(decidir('unzip -o x.zip -d .', { congelado: true }).acao, 'allow');
});

// ————————————————— A ASPA QUE NÃO FECHA (rodada T) —————————————————
//
// `\` não é escape (decisão registrada em workspace.mjs: caminho de Windows), então `echo "a\"b"`
// fecha aspas onde o bash não fecharia e TUDO que vem depois vira um token inerte — o parser
// dessincroniza e `alvosDoComando` não acha alvo nenhum. O sinal `aspasAbertas` já existia e o
// `delivery-gate` já o honrava; até esta rodada o `escrita-bash` o DESCARTAVA, e os quatro
// destrutivos — negados quando sozinhos — passavam todos atrás do escape. Não eram quatro
// buracos: era um.
//
// A regra NÃO é falhar fechado em toda dessincronização: `echo it's ok` tem `aspasAbertas: true`
// (um apóstrofo solto basta), e negá-lo seria falso positivo em texto comum, a pior categoria sob
// o modelo de ameaça deste projeto. E NÃO é a regra estreita que exigia padrão destrutivo junto:
// medida, ela fechava 1 das 4 famílias, porque `>`, `sed -i` e `mv` não casam padrão de `rm` —
// e fecho parcial de bypass é pior que fecho nenhum, porque faz o buraco parecer resolvido.

const FAMILIAS_ATRAS_DO_ESCAPE = [
  ['echo "a\\"b" && rm -rf .claude/hooks', 'rm -rf'],
  ['echo "a\\"b" && echo x > CLAUDE.md', 'redirecao'],
  ['echo "a\\"b" && sed -i s/a/b/ .claude/hooks/kit.mjs', 'sed -i'],
  ['echo "a\\"b" && mv .claude/hooks/kit.mjs /tmp/', 'mv'],
];

for (const [comando, familia] of FAMILIAS_ATRAS_DO_ESCAPE) {
  test(`aspa aberta — a família \`${familia}\` atrás do escape passa a ser NEGADA`, () => {
    // Uma por família, e não uma só: a regra estreita que caiu por medição fechava só a do `rm`.
    const r = decidir(comando, { congelado: true });
    assert.equal(r.acao, 'deny', comando);
    assert.match(r.motivo, /aspa/i, 'a mensagem tem que nomear a aspa como causa');
  });
}

test('aspa aberta — apóstrofo solto SEM caminho protegido continua liberado', () => {
  // A ponta que impede alguém de "simplificar" a regra para negar toda dessincronização. Se este
  // teste ficar vermelho, a trava virou o fail-closed cego que foi descartado por medição.
  assert.equal(decidir("echo it's ok", { congelado: true }).acao, 'allow');
  assert.equal(decidir("echo it's done, ship it", { congelado: true }).acao, 'allow');
});

test('aspa aberta — o falso positivo ACEITO, e a mensagem que o torna acionável', () => {
  // Apóstrofo E menção a caminho protegido na mesma linha. Foi pesado contra o ganho e o usuário
  // decidiu por fechar. O consultor que cair aqui não vai adivinhar que o problema é a aspa — a
  // mensagem tem que dizer que ela não fecha e que por isso o resto não pôde ser lido.
  const r = decidir("echo it's in .claude/hooks", { congelado: true });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /aspa/i, 'a causa');
  assert.match(r.motivo, /não fecha/i, 'e qual é o problema com ela');
  assert.match(r.motivo, /\.claude\/hooks/, 'o caminho que a fez morder');
  assert.match(r.motivo, /feche a aspa/i, 'e a correção, que é óbvia depois de dita');
});

test('aspa aberta — o caminho normal não muda: quem já decide continua decidindo', () => {
  // A regra não pode roubar a decisão de quem já decide. `rm -rf .claude/hooks` sozinho não
  // dessincroniza nada, e a mensagem dele continua sendo a específica da trava de sempre.
  const normal = decidir('rm -rf .claude/hooks', { congelado: true });
  assert.equal(normal.acao, 'deny');
  assert.match(normal.motivo, /escreve em/, 'a mensagem é a da trava de sempre');
  assert.doesNotMatch(normal.motivo, /aspa/i, 'e não a da aspa');
  assert.equal(decidir('echo ok', { congelado: true }).acao, 'allow');
});

test('aspa aberta — a extração corta o que NÃO pode estar dentro de um caminho', () => {
  // Sondado antes de mutar, e as três formas GRUDADAS não estavam presas por teste nenhum: com um
  // corte só por espaço, `x>CLAUDE.md`, `--output=CLAUDE.md` e `of=CLAUDE.md` viram um fragmento
  // que não casa caminho nenhum, e as três voltam a passar atrás do escape. Extração generosa é
  // segura porque `protegido()` devolve `null` para o que não é protegido; fragmento a MENOS é
  // que custa o bypass.
  for (const cmd of [
    'echo "a\\"b" && echo x>CLAUDE.md',
    'echo "a\\"b" && curl --output=CLAUDE.md http://x',
    'echo "a\\"b" && dd if=/dev/zero of=CLAUDE.md',
  ]) assert.equal(decidir(cmd, { congelado: true }).acao, 'deny', cmd);
});

test('aspa aberta — o fragmento é RESOLVIDO contra a raiz antes de ser perguntado', () => {
  // ACHADO POR MUTAÇÃO, e a mutação sobreviveu à primeira suíte: perguntar `protegido()` sobre o
  // fragmento CRU dá o mesmo veredito em todo caso relativo, e por isso nenhum teste a matava.
  // A diferença aparece no ABSOLUTO, e ela é dos dois lados:
  //   - absoluto DE DENTRO do projeto precisa ser reconhecido (o `cwd` da casca é absoluto);
  //   - absoluto de FORA precisa continuar liberado — o harness não governa o disco inteiro.
  // Sem a resolução, `ehDestruicaoCatastrofica` LANÇA em "recebeu caminho absoluto", e como esta
  // trava é bloqueante o despachante transforma isso em deny: `cat C:\outro\CLAUDE.md` atrás de um
  // apóstrofo viraria falso positivo com mensagem de falha do harness. Medido nos dois sentidos.
  const dentro = resolve(RAIZ, '.claude/hooks');
  const fora = resolve('/outro-projeto', 'CLAUDE.md');
  const rDentro = decidir(`echo it's ok && rm -rf ${dentro}`, { congelado: true });
  assert.equal(rDentro.acao, 'deny');
  assert.match(rDentro.motivo, /aspa/i, 'e pela regra da aspa, não por exceção');
  assert.equal(decidir(`echo it's ok && rm -rf ${fora}`, { congelado: true }).acao, 'allow');
  assert.equal(decidir(`echo it's ok && cat ${fora}`, { congelado: true }).acao, 'allow');
});

test('aspa aberta — comando LEGÍVEL com aspa aberta é julgado por quem já julgava', () => {
  // A ordem importa e é a diferença entre duas mensagens. Aqui o primeiro segmento parseia bem e
  // o apóstrofo só aparece depois: o laço de alvos acha `.claude/hooks` em posição de escrita, e a
  // mensagem tem que ser a específica — que nomeia o comando e o alvo —, não a genérica da aspa.
  const r = decidir("rm -rf .claude/hooks && echo it's ok", { congelado: true });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /`rm/, 'a mensagem nomeia o comando');
  assert.doesNotMatch(r.motivo, /aspa/i, 'a rede de baixo não rouba a decisão de quem já decide');
});

test('aspa aberta — resíduo declarado: a CONTENÇÃO não atravessa a regra', () => {
  // `.claude` e `*` são negados quando o comando é legível (por `protegidosContidosEm`) e LIBERAM
  // atrás do escape, porque a regra pergunta só "este fragmento É protegido?". Estender a
  // contenção aos fragmentos do texto cru faria um `.` solto — que relativiza para a raiz, e a
  // raiz contém tudo — negar `echo it's ok && git add .`. Trocar o falso negativo raro por esse
  // falso positivo diário é a troca que o modelo de ameaça proíbe. Este teste registra o preço:
  // se alguém fechar isso um dia, ele fica vermelho e a decisão volta à mesa COM as duas linhas
  // de baixo do lado.
  assert.equal(decidir('echo "a\\"b" && rm -rf .claude', { congelado: true }).acao, 'allow');
  assert.equal(decidir('echo "a\\"b" && rm -rf *', { congelado: true }).acao, 'allow');
  assert.equal(decidir("echo it's ok && git add .", { congelado: true }).acao, 'allow');
  assert.equal(decidir("echo it's ok && ls .", { congelado: true }).acao, 'allow');
});

test('aspa aberta — o CONGELAMENTO atravessa a regra nova', () => {
  // É o teste que prova que o predicado foi REUSADO em vez de uma lista de caminhos ser escrita.
  // `outputs/explore/` só é protegido quando o marcador existe, e quem sabe disso é o
  // `protegido()` que o `avaliar` monta — com o memo do `io.exploreCongelado` incluso. Lista de
  // caminhos própria negaria nos dois estados e ficaria vermelha na segunda linha.
  const cmd = 'echo "a\\"b" && rm -rf outputs/explore/gaps.md';
  assert.equal(decidir(cmd, { congelado: true }).acao, 'deny');
  assert.equal(decidir(cmd, { congelado: false }).acao, 'allow');
});

test('aspa aberta — número PAR de aspas não dessincroniza, e a regra nem roda', () => {
  // Medido antes de decidir, para não temer o que não acontece: caminho do Windows entre aspas,
  // caminho terminado em barra, JSON com aspas escapadas, commit com aspas escapadas e `sed` com
  // aspas escapadas têm número PAR. O gatilho acidental realista é o apóstrofo solto.
  for (const cmd of [
    'cd "C:\\Users\\Murilo\\proj" && npm test',
    'cd "C:\\Users\\Murilo\\proj\\" && npm test',
    'echo "{\\"a\\": 1}" > cfg.json',
    'git commit -m "corrige o \\"bug\\" do parser"',
    'sed -i "s/\\"a\\"/\\"b\\"/" src/x.js',
  ]) assert.equal(decidir(cmd, { congelado: true }).acao, 'allow', cmd);
});

// ————————————— A CEGUEIRA MULTI-REPO, E AS QUATRO PONTAS QUE A PRENDEM (Task 4b) —————————————
//
// MEDIDO EXECUTANDO, antes do conserto: num workspace multi-repo com o Explore CONGELADO,
// `sed -i portal-docs/outputs/explore/gaps.md` LIBERAVA, enquanto o mesmo comando em mono-repo
// (`sed -i outputs/explore/gaps.md`) NEGAVA. A causa é a mesma que a trava `congelamento` já
// consertou: esta relativizava contra `io.cwd()` e perguntava `io.exploreCongelado(io.cwd())`,
// enquanto o marcador mora em `<repo de docs>/outputs/spec/` e o `ehDoExplore` é ancorado em
// PREFIXO — `portal-docs/outputs/explore/gaps.md` não casa `outputs/explore/`.
//
// POR QUE NÃO É CANTO EXÓTICO. Multi-repo é o layout que a rule do Explore trata como normal (o
// `workspace.md` é o primeiro artefato que ela manda criar), e é a proibição de escrita no Explore
// que PAGA a dispensa de frescor da Decisão 22: forjar o marcador desliga o frescor e liga esta
// trava. Cega aqui, a troca valia para `Write`/`Edit` e NÃO para `Bash` — e o modelo de ameaça
// deste projeto põe o shell como o vetor ALTO, não o baixo.
//
// AS QUATRO PONTAS, e sem as quatro juntas uma trava que negasse tudo passaria em algumas delas:
// (1) multi congelado NEGA; (2) mono congelado continua NEGANDO; (3) multi NÃO congelado LIBERA;
// (4) comando legítimo em multi LIBERA, e sem tocar o disco além do necessário.
//
// DISCO REAL, e não dublê: o `descobrirWorkspace` decide quem é candidato a repo de docs com
// `existsSync`, que não é ponto de injeção. `realpathSync.native` porque o `%TEMP%` do Windows
// chega em forma curta (`MURILO~1`) e a resolução por identidade compara caminho canônico.

/** Workspace multi-repo REAL: `portal-docs` é o único candidato a repo de docs. */
function workspaceMultiRepo({ congelado = true } = {}) {
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'eb-multi-')));
  mkdirSync(join(raiz, 'portal-docs', 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(raiz, 'portal-docs', 'outputs', 'spec'), { recursive: true });
  mkdirSync(join(raiz, '.claude', 'hooks'), { recursive: true });
  writeFileSync(join(raiz, 'portal-docs', 'outputs', 'explore', 'gaps.md'), '# GAPs\n\nCorpo.\n');
  writeFileSync(join(raiz, 'CLAUDE.md'), '# projeto\n');
  if (congelado) writeFileSync(join(raiz, 'portal-docs', MARCADOR_CONGELAMENTO), '# congelado\n');
  // Irmão que NÃO é candidato: não tem `outputs/explore` nem `outputs/spec`. Sem ele o fixture não
  // distinguiria "achou o repo de docs" de "pegou a única subpasta que existe".
  mkdirSync(join(raiz, 'portal-app', 'src'), { recursive: true });
  writeFileSync(join(raiz, 'portal-app', 'src', 'app.ts'), 'export const x = 1;\n');
  return raiz;
}

/** Mono-repo REAL, para a ponta 2 ser medida pela mesma casca que a ponta 1. */
function workspaceMonoRepo({ congelado = true } = {}) {
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'eb-mono-')));
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  mkdirSync(join(raiz, 'outputs', 'spec'), { recursive: true });
  mkdirSync(join(raiz, 'src'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'explore', 'gaps.md'), '# GAPs\n\nCorpo.\n');
  if (congelado) writeFileSync(join(raiz, MARCADOR_CONGELAMENTO), '# congelado\n');
  return raiz;
}

/** A casca de produção inteira, menos a única coisa que aponta para o projeto errado. */
const soBash = (raiz, extra = {}) => criarRegistro({ ...IO_REAL, cwd: () => raiz, ...extra })
  .filter((v) => v.nome === 'escrita-bash');

const noDisco = (raiz, comando, extra) => despachar(bash(comando), soBash(raiz, extra));

test('M1 (ponta 1) — MULTI-REPO congelado: `sed -i` no Explore do repo de docs é NEGADO', () => {
  const raiz = workspaceMultiRepo();
  const r = noDisco(raiz, 'sed -i s/a/b/ portal-docs/outputs/explore/gaps.md');
  assert.equal(r.acao, 'deny', r.motivo || '');
  // A MENSAGEM TEM QUE SER A DO CONGELAMENTO, e não a de zona imutável nem a genérica da aspa: é
  // ela que diz ao consultor o que fazer agora, e a saída dela (remover o marcador) é a única.
  assert.match(r.motivo, /\*\*congelado\*\* na conclusão do `spec-product`/);
  assert.match(r.motivo, /_explore-congelado\.md/);
  assert.match(r.motivo, /\*\*remova esse arquivo\*\*/);
  // E ela cita o caminho COMO O CONSULTOR O DIGITOU — relativo à `cwd`, com a subpasta do repo. A
  // trava do `congelamento` cita o caminho relativo à raiz dos artefatos porque o `file_path` de
  // uma tool de escrita é absoluto e ninguém o digitou; aqui a mensagem ecoa o comando.
  assert.match(r.motivo, /`sed` escreve em `portal-docs\/outputs\/explore\/gaps\.md`/);
});

test('M2 (ponta 2) — MONO-REPO congelado continua NEGANDO, pela mesma casca real', () => {
  // A exigência explícita do dono: há muitos testes verdes sobre o mono-repo, e o conserto não
  // pode movê-lo. O resolvedor devolve o `rel` INTACTO quando não há multi-repo.
  const r = noDisco(workspaceMonoRepo(), 'sed -i s/a/b/ outputs/explore/gaps.md');
  assert.equal(r.acao, 'deny', r.motivo || '');
  assert.match(r.motivo, /\*\*congelado\*\*/);
  assert.match(r.motivo, /`sed` escreve em `outputs\/explore\/gaps\.md`/);
});

test('M3 (ponta 3) — MULTI-REPO sem o marcador: a MESMA escrita LIBERA', () => {
  // Sem esta ponta, uma trava que passasse a negar todo caminho do Explore satisfaria M1 e M2. Ela
  // é a que prova que o conserto discrimina por CONGELAMENTO, e não por reconhecer o caminho.
  const raiz = workspaceMultiRepo({ congelado: false });
  const r = noDisco(raiz, 'sed -i s/a/b/ portal-docs/outputs/explore/gaps.md');
  assert.equal(r.acao, 'allow', r.motivo || '');
});

test('M4 (ponta 4) — comando LEGÍTIMO em multi-repo libera, e sem tocar o disco', () => {
  // A ponta que o modelo de ameaça desta trava faz valer mais que as outras três: falso positivo
  // atrapalhando trabalho legítimo é PIOR que bypass exótico. Mede duas coisas de uma vez — o
  // veredito, e que o pré-filtro puro corta ANTES do disco: o custo da resolução de raiz não pode
  // aparecer em todo comando de `Bash`.
  const raiz = workspaceMultiRepo();
  const chamadas = [];
  const espia = {
    lerDiretorio: (...a) => { chamadas.push('lerDiretorio'); return IO_REAL.lerDiretorio(...a); },
    exploreCongelado: (...a) => { chamadas.push('exploreCongelado'); return IO_REAL.exploreCongelado(...a); },
  };
  for (const comando of [
    'echo ok',
    'git status',
    'git add .',
    'git commit -m "ajusta portal-docs/outputs/explore/gaps.md conforme revisao"',
    'cat portal-docs/outputs/explore/gaps.md',
    'sed -n 1,50p portal-docs/outputs/explore/gaps.md',
    "echo it's ok",
    'sed -i s/a/b/ portal-app/src/app.ts',
    'npm run build',
  ]) {
    const r = noDisco(raiz, comando, espia);
    assert.equal(r.acao, 'allow', `${comando}: ${r.motivo || ''}`);
  }
  assert.deepEqual(chamadas, [], 'comando legítimo não pode custar disco nesta trava');
});

test('M5 — as SEIS famílias de alvo enxergam a raiz dos artefatos, não só o `sed -i`', () => {
  // O `alvosDoComando` produz seis tipos de alvo (`redirecao`, `opcao`, `arvore`, `destino`,
  // `in-place`, `git`), e todos passam pelo MESMO `protegido()`. Este teste é o que impede o
  // conserto de fechar uma família e deixar as outras cinco cegas — que foi como o buraco da aspa
  // quase foi "fechado" na rodada T, e fecho parcial é pior que fecho nenhum.
  const raiz = workspaceMultiRepo();
  const ALVO = 'portal-docs/outputs/explore/gaps.md';
  const CASOS = [
    ['redirecao', `echo x > ${ALVO}`],
    ['redirecao (append)', `echo x >> ${ALVO}`],
    ['opcao', `dd if=/dev/zero of=${ALVO}`],
    ['opcao (longa)', `curl --output=${ALVO} http://exemplo`],
    ['arvore', 'rm -rf portal-docs/outputs/explore'],
    ['arvore (origem do mv)', `mv ${ALVO} antigo.md`],
    ['destino', `cp novo.md ${ALVO}`],
    ['in-place (sed)', `sed -i s/a/b/ ${ALVO}`],
    ['in-place (truncate)', `truncate -s 0 ${ALVO}`],
    ['in-place (tee)', `tee ${ALVO} < entrada.md`],
    ['git', `git checkout -- ${ALVO}`],
    ['glob que é o segmento inteiro', 'sed -i s/a/b/ portal-docs/outputs/explore/*'],
    ['cd seguido', 'cd portal-docs/outputs && rm -rf explore'],
    ['travessia que reentra', 'sed -i s/a/b/ portal-docs/outputs/spec/../explore/gaps.md'],
    ['outra caixa', 'sed -i s/a/b/ portal-docs/outputs/Explore/gaps.md'],
  ];
  for (const [familia, comando] of CASOS) {
    const r = noDisco(raiz, comando);
    assert.equal(r.acao, 'deny', `${familia}: ${comando} devia negar`);
    assert.match(r.motivo, /congelad/i, familia);
  }
});

test('M6 — em multi-repo o irmão de CÓDIGO continua editável, e o repo de docs fora do Explore também', () => {
  // A trava não passou a negar tudo que tem `portal-docs` no caminho. `outputs/spec/` é a zona em
  // que o trabalho CONTINUA depois do congelamento — negá-la seria trancar a saída.
  const raiz = workspaceMultiRepo();
  for (const comando of [
    'sed -i s/a/b/ portal-app/src/app.ts',
    'echo x > portal-docs/outputs/spec/modules.md',
    'rm -rf portal-app/build',
    'mv portal-docs/outputs/spec/rascunho.md portal-docs/outputs/spec/final.md',
  ]) {
    const r = noDisco(raiz, comando);
    assert.equal(r.acao, 'allow', `${comando}: ${r.motivo || ''}`);
  }
});

test('M12 — o Explore que conta é o DO REPO DE DOCS, não qualquer `outputs/explore/` do workspace', () => {
  // A PONTA QUE PROVA DISCRIMINAÇÃO EM VEZ DE RECONHECIMENTO CEGO, e ela é o par exato de M1: uma
  // trava que apenas procurasse `outputs/explore/` em qualquer profundidade negaria isto também, e
  // passaria em M1, M2 e M5. `<cwd>/outputs/explore/` num workspace multi-repo NÃO é o pré-projeto
  // congelado — é uma pasta solta na raiz do workspace, e o marcador que a governaria não existe.
  //
  // Também é o que separa o pré-filtro do veredito: `podeSerDoExplore` diz `true` aqui (é ele que
  // autoriza gastar disco), e quem responde `null` é o resolvedor, porque o caminho está FORA do
  // repo de docs. Quem nega é o `ehDoExplore`, sobre o caminho já relativo à raiz certa.
  const raiz = workspaceMultiRepo();
  mkdirSync(join(raiz, 'outputs', 'explore'), { recursive: true });
  writeFileSync(join(raiz, 'outputs', 'explore', 'nota.md'), '# nota\n');
  const r = noDisco(raiz, 'sed -i s/a/b/ outputs/explore/nota.md');
  assert.equal(r.acao, 'allow', r.motivo || '');
});

test('M7 — a raiz é resolvida UMA vez por comando, mesmo com vários alvos do Explore', () => {
  const raiz = workspaceMultiRepo();
  const chamadas = [];
  const espia = {
    lerDiretorio: (...a) => { chamadas.push('lerDiretorio'); return IO_REAL.lerDiretorio(...a); },
    exploreCongelado: (...a) => { chamadas.push('exploreCongelado'); return IO_REAL.exploreCongelado(...a); },
  };
  const r = noDisco(
    raiz,
    'sed -i s/a/b/ portal-docs/outputs/explore/a.md portal-docs/outputs/explore/b.md portal-docs/outputs/explore/c.md',
    espia,
  );
  assert.equal(r.acao, 'deny');
  // DUAS LISTAGENS, UMA DESCOBERTA. O que este teste prende é a MEMOIZAÇÃO — três alvos do Explore
  // no mesmo comando não pagam três descobertas —, e o número de listagens POR descoberta é outro
  // fato: são duas desde a Task 4d, porque o `descobrirWorkspace` lista o `cwd` (para achar a
  // subpasta candidata) e depois varre `<cwd>/outputs/explore` (para saber se a `cwd` tem CONTEÚDO,
  // e não só o `.gitkeep` que o template entrega rastreado no git). A segunda listagem só acontece
  // quando existe candidata, que é o caso deste fixture; sem candidata o ramo não é consultado. A
  // asserção é exata de propósito: se a descoberta passar a custar TRÊS, quem mexeu vê o número.
  assert.deepEqual(chamadas, ['lerDiretorio', 'lerDiretorio', 'exploreCongelado'],
    'os dois memos: UMA descoberta de workspace (duas listagens) e uma leitura do marcador por comando');
});

test('M8 — workspace AMBÍGUO nega: bloqueante que não sabe onde olhar não libera', () => {
  // FALHA FECHADO, e é coerente com as outras duas travas que fazem esta mesma pergunta. Liberar
  // transformaria "não sei olhar" em "não está congelado", que é o veredito OPOSTO. A mensagem é a
  // do `avaliarRaizIndeterminada` (zonas.mjs) — um dono só para a redação deste fato — e a saída
  // que ela dá é executável: o `--validar` reporta exatamente este problema.
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'eb-ambiguo-')));
  for (const sub of ['portal-docs', 'outro-docs']) {
    mkdirSync(join(raiz, sub, 'outputs', 'explore'), { recursive: true });
    mkdirSync(join(raiz, sub, 'outputs', 'spec'), { recursive: true });
  }
  const r = noDisco(raiz, 'sed -i s/a/b/ portal-docs/outputs/explore/gaps.md');
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /workspace indeterminado/i);
  assert.match(r.motivo, /ambiguo/);
  assert.match(r.motivo, /portal-docs/);
  assert.match(r.motivo, /outro-docs/);
  assert.match(r.motivo, /--validar/);
});

test('M9 — raiz ILEGÍVEL nega, e é o `io.lerDiretorio` da trava que responde', () => {
  // Duas coisas: a outra metade da falha fechada (`cwd-ilegivel`), e o wiring — a trava tem que
  // passar o `io.lerDiretorio` ao `descobrirWorkspace`, e não deixá-lo cair no `readdirSync`
  // default, que leria o disco de verdade e responderia "mono-repo" sobre uma raiz ilegível.
  const raiz = workspaceMonoRepo({ congelado: false });
  const r = noDisco(raiz, 'sed -i s/a/b/ outputs/explore/gaps.md', {
    lerDiretorio: () => { const e = new Error('permission denied'); e.code = 'EACCES'; throw e; },
  });
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /workspace indeterminado/i);
  assert.match(r.motivo, /cwd-ilegivel/);
});

test('M10 — a raiz indeterminada NÃO rouba a decisão de quem tem mensagem mais específica', () => {
  // A mesma ordem que já vale para a regra da aspa: a indeterminação é anotada e a negação sai
  // DEPOIS do laço de alvos, então um deny mais específico — a zona imutável, aqui — é o que o
  // consultor lê. Ele é o acionável; "resolva o layout do workspace" não conserta um `rm` no
  // maquinário do template.
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'eb-ambiguo2-')));
  for (const sub of ['portal-docs', 'outro-docs']) {
    mkdirSync(join(raiz, sub, 'outputs', 'explore'), { recursive: true });
    mkdirSync(join(raiz, sub, 'outputs', 'spec'), { recursive: true });
  }
  mkdirSync(join(raiz, '.claude', 'hooks'), { recursive: true });
  const r = noDisco(raiz, 'sed -i s/a/b/ portal-docs/outputs/explore/gaps.md && rm -rf .claude/hooks');
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /zona imutável/i);
  assert.doesNotMatch(r.motivo, /workspace indeterminado/i);
});

test('M11 — resíduo declarado: a CONTENÇÃO não atravessa a subpasta do repo de docs', () => {
  // `rm -rf portal-docs/outputs`, `rm -rf portal-docs` e `mv portal-docs/outputs velho` LIBERAM com
  // o Explore congelado, enquanto `rm -rf outputs` em mono-repo NEGA. A razão é o CONTRATO do
  // `avaliarComando`: ele pergunta contenção sobre o caminho relativo à `cwd` (`protegidosContidosEm`
  // recebe a árvore alcançada nessa forma), e o pré-filtro `podeSerDoExplore` responde `false` para
  // `portal-docs/outputs` — a resolução da raiz dos artefatos acontece DENTRO do `protegido`, um
  // nível abaixo de quem monta a lista de contidos. Fica registrado, não fechado: se alguém fechar
  // isso um dia, este teste fica vermelho e a decisão volta à mesa.
  //
  // AS CINCO FORMAS DA FAMÍLIA. A contagem já subdimensionou duas vezes — "duas" na Task 4b, "três"
  // na 4c —, e subdimensionar o resíduo de um bloqueante é pior que registrá-lo: um conserto que
  // pegasse só as formas prendidas passaria por um teste incompleto e o resíduo seguiria aberto nas
  // outras. O que as cinco têm em comum é a VIA, não o comando: qualquer forma que alcance a árvore
  // do repo de docs SEM nomear `outputs/explore` sai pelo mesmo buraco de contenção, e `rm`, `mv` e
  // `cp -r` são só os três verbos que a trava já reconhece como alcançando árvore.
  //
  // O que NÃO liberou: tudo que NOMEIA o caminho do Explore, que é o alvo de acidente do briefing
  // (`sed -i` no arquivo errado) e é o que o `M5` cobre nas seis famílias.
  const raiz = workspaceMultiRepo();
  assert.equal(noDisco(raiz, 'rm -rf portal-docs/outputs').acao, 'allow');
  assert.equal(noDisco(raiz, 'rm -rf portal-docs').acao, 'allow');
  assert.equal(noDisco(raiz, 'mv portal-docs/outputs velho').acao, 'allow');
  assert.equal(noDisco(raiz, 'mv portal-docs velho').acao, 'allow');
  assert.equal(noDisco(raiz, 'cp -r portal-docs velho').acao, 'allow');
  // A âncora do outro lado: em mono-repo a contenção continua valendo, e é o `A7` da composição e
  // o `rm -rf outputs` da tabela `NEGAM` que a prendem. Aqui só se registra que ela vale.
  assert.equal(noDisco(workspaceMonoRepo(), 'rm -rf outputs').acao, 'deny');
});

// ————————————————————————————— Decisão 40 no gatilho Bash —————————————————————————————

test('Decisão 67 — zona imutável por Bash: nega no clone, abre no template', () => {
  for (const cmd of [
    'rm -rf .claude/skills/spec-init',
    "sed -i 's/a/b/' .claude/hooks/kit.mjs",
    'echo x > CLAUDE.md',
    'rm -rf .claude', // contenção: a árvore contém a zona inteira
  ]) {
    const clone = decidir(cmd);
    assert.equal(clone.acao, 'deny', `clone: ${cmd}`);
    assert.match(clone.motivo, /muda no template, não aqui/);
    // a assinatura do escrita-bash (cita o comando) sobrevive
    assert.match(clone.motivo, / escreve em `| alcança tudo que está em `/);
    assert.equal(decidir(cmd, { template: true }).acao, 'allow', `template: ${cmd}`);
  }
  // o que NÃO abre no template: o histórico do repositório continua guardado
  assert.equal(decidir('rm -rf .git', { template: true }).acao, 'deny');
});

test('Decisão 67 — criar o marcador por Bash é negado no clone', () => {
  for (const cmd of ['echo > .harness-template', 'cp /dev/null ./.harness-template', 'mv x .HARNESS-TEMPLATE']) {
    const clone = decidir(cmd);
    assert.equal(clone.acao, 'deny', cmd);
    assert.match(clone.motivo, /marcador do template/);
    assert.match(clone.motivo, /pelo terminal/);
    assert.equal(decidir(cmd, { template: true }).acao, 'allow', `template: ${cmd}`);
  }
  // A FRESTA DO `touch` FECHOU: ela era metade do bypass reproduzido (`rm harness-zona*` +
  // `touch .harness-template`). `touch` conta como escrita, e `mkdir` conta para o marcador.
  for (const cmd of ['touch .harness-template', 'touch ./.HARNESS-TEMPLATE', 'mkdir .harness-template']) {
    const r = decidir(cmd);
    assert.equal(r.acao, 'deny', cmd);
    assert.match(r.motivo, /marcador do template/, cmd);
    assert.equal(decidir(cmd, { template: true }).acao, 'allow', `template: ${cmd}`);
  }
});

test('o allow não paga a detecção: zero chamadas a ehTemplate em comando comum', () => {
  for (const cmd of ['echo ola', 'ls -la', 'git status', 'cat .claude/hooks/kit.mjs']) {
    const io = ioFalso({ template: true });
    const r = despachar(bash(cmd), criarRegistro(io));
    assert.equal(r.acao, 'allow', cmd);
    assert.equal(io.chamadas.filter((c) => c[0] === 'ehTemplate').length, 0, `${cmd} perguntou ehTemplate`);
  }
});

test('a zona pergunta ehTemplate UMA vez por comando; congelamento e .git não perguntam', () => {
  for (const cmd of ['rm -rf .claude/hooks', 'rm -rf .claude/hooks .claude/skills CLAUDE.md', 'rm -rf .claude']) {
    for (const template of [true, false]) {
      const zona = ioFalso({ template });
      despachar(bash(cmd), criarRegistro(zona));
      assert.equal(zona.chamadas.filter((c) => c[0] === 'ehTemplate').length, 1, `${cmd} (template: ${template})`);
    }
  }
  const git = ioFalso({ template: true });
  despachar(bash('rm -rf .git'), criarRegistro(git));
  assert.equal(git.chamadas.filter((c) => c[0] === 'ehTemplate').length, 0, 'catástrofe não é zona');
  // A terceira perna que o título promete: deny por CONGELAMENTO também não pergunta ehTemplate.
  // O `template: true` fica ligado de propósito — se `montarMotivo` chamasse `ehTemplate()` cedo
  // demais (antes de saber o rótulo), esta perna pegaria a chamada extra que a de zona não pega.
  const congelamento = ioFalso({ template: true, congelado: true });
  const r = despachar(bash('sed -i s/a/b/ outputs/explore/gaps.md'), criarRegistro(congelamento));
  assert.equal(r.acao, 'deny');
  assert.match(r.motivo, /congelad/i, 'o motivo precisa ser o do congelamento, não o da zona');
  assert.equal(
    congelamento.chamadas.filter((c) => c[0] === 'ehTemplate').length,
    0,
    'congelamento não é zona',
  );
});

test('um dono só: as duas travas terminam com o MESMO parágrafo, na zona e no marcador', () => {
  // A divergência que a Decisão 40 fechou não era hipotética: esta trava dizia "não neste clone" e
  // o `avaliarZona` dizia "não aqui", sobre o mesmo fato. Uma asserção por FRASE não pegaria a
  // divergência de volta — os dois textos re-inlinados passariam nos dois lugares. O que prende é
  // comparar as SAÍDAS das duas travas contra o dono do parágrafo.
  for (const [rel, dono] of [
    ['.claude/hooks/kit.mjs', paragrafoDoMaquinario],
    ['.harness-template', paragrafoDoMarcador],
  ]) {
    const paragrafo = dono().join('\n');
    const porBash = decidir(`rm -rf ${rel}`);
    const porWrite = despachar(
      { tool_name: 'Write', tool_input: { file_path: `${RAIZ}/${rel}`, content: 'x' } },
      criarRegistro(ioFalso()),
    );
    assert.equal(porBash.acao, 'deny', rel);
    assert.equal(porWrite.acao, 'deny', rel);
    assert.ok(porBash.motivo.endsWith(paragrafo), `${rel}: a trava do Bash divergiu do dono`);
    assert.ok(porWrite.motivo.endsWith(paragrafo), `${rel}: a trava do Write divergiu do dono`);
  }
});

// ————————————————————— o glob que apagava a chave (Decisão 67, bypass) —————————————————————
//
// `rm harness-zona*` era lido como o nome literal `harness-zona*`, que não é protegido, e o shell
// o expandia para o manifesto. Com o manifesto fora do disco e o marcador criado, a zona abria.

// O nome da pasta do maquinário por extenso: os geradores o reescrevem (`.cursor`, `.kiro`), mas não
// reescrevem um fragmento como `.cl*`. Os globs parciais saem dele, para valerem nas três saídas.
const PASTA = '.claude';
const PASTA_GLOB_INICIO = `${PASTA.slice(0, 3)}*`;
const PASTA_GLOB_LETRA = `${PASTA.slice(0, 3)}?${PASTA.slice(4)}`;
// Idem para o arquivo de instruções da raiz (`AGENTS.md` nas saídas Cursor e Kiro).
const ARQUIVO_RAIZ = 'CLAUDE.md';

test('glob em posição de escrita casa o manifesto, o marcador e a zona por correspondência', () => {
  for (const cmd of [
    'rm harness-zona*', 'rm -f harness-zona.lock.*', 'rm -f HARNESS-ZONA?LOCK.JSON', 'rm .harness-t*',
    'rm -f *.lock.json', 'mv harness-zona* /tmp/', 'cp vazio.json harness-zona.lock.jso[n]',
    `rm ${PASTA_GLOB_LETRA}/hooks/kit.mjs`, `rm -rf ${PASTA_GLOB_INICIO}`, 'rm -rf .claude/sk*', `rm ${ARQUIVO_RAIZ.slice(0, -1)}?`, `rm -rf *${ARQUIVO_RAIZ.slice(2, 5)}*`,
    'sed -i s/a/b/ .claude/hooks/*.mjs', 'truncate -s 0 .claude/*/kit.mjs',
  ]) {
    const r = decidir(cmd);
    assert.equal(r.acao, 'deny', cmd);
    assert.match(r.motivo, /zona imutável|marcador do template/, cmd);
    assert.equal(decidir(cmd, { template: true }).acao, 'allow', `template: ${cmd}`);
  }
  // o padrão aparece na mensagem, junto com o que ele alcança
  assert.match(decidir('rm harness-zona*').motivo, /harness-zona\*.*harness-zona\.lock\.json/s);
});

test('glob que não alcança caminho protegido continua livre', () => {
  // `x/*/y.tmp`: o `*` do meio não casa nome oculto no bash, e `x/` não contém nada protegido.
  for (const cmd of ['rm *.log', 'rm build-*', 'rm -f build/*.tmp', 'rm -rf dist/*', 'rm -f x/*/y.tmp', 'mv relatorio-*.md outputs/',
    'cp *.md outputs/spec/', 'rm -f outputs/spec/rascunho-?.md']) {
    assert.equal(decidir(cmd).acao, 'allow', cmd);
  }
});

// ————————————————————— extensões do projeto na zona —————————————————————

const MANIFESTO = {
  zona: ['CLAUDE.md', '.claude/agents/', '.claude/skills/', '.claude/hooks/'],
  arquivos: {
    '.claude/agents/corretor.md': 'h', '.claude/skills/spec-report/SKILL.md': 'h', '.claude/hooks/kit.mjs': 'h',
  },
};

test('extensão do projeto: agente e skill próprios passam no clone; o que é do pacote não', () => {
  for (const cmd of ['cp meu.md .claude/agents/meu-agente.md', 'echo x > .claude/skills/minha/SKILL.md',
    'rm -rf .claude/skills/minha', 'sed -i s/a/b/ .claude/agents/meu-agente.md']) {
    assert.equal(decidir(cmd, { manifesto: MANIFESTO }).acao, 'allow', cmd);
    assert.equal(decidir(cmd).acao, 'deny', `sem manifesto: ${cmd}`);
  }
  for (const cmd of ['rm .claude/agents/corretor.md', 'echo x > .claude/skills/spec-report/novo.md',
    'rm .claude/agents/*', 'rm -rf .claude/skills', 'rm -rf .claude/agents']) {
    assert.equal(decidir(cmd, { manifesto: MANIFESTO }).acao, 'deny', cmd);
  }
});

// ————————————————————— a tool PowerShell —————————————————————

const ps = (command) => ({ tool_name: 'PowerShell', tool_input: { command } });
const decidirPs = (command, opcoes) => despachar(ps(command), criarRegistro(ioFalso(opcoes)));

test('PowerShell: verbo de escrita junto de caminho protegido NEGA no clone e passa no template', () => {
  for (const cmd of [
    'Remove-Item harness-zona.lock.json', 'Remove-Item -Force harness-zona*', 'del .\\harness-zona.lock.json',
    'ri harness-zona.lock.json', 'New-Item .harness-template -ItemType File', 'ni .harness-template',
    "Set-Content -Path CLAUDE.md -Value 'x'", "'x' | Out-File .claude/hooks/kit.mjs",
    "Add-Content .claude/settings.json 'x'", "'x' > .claude/hooks/kit.mjs", "'x' >> CLAUDE.md",
    "[IO.File]::WriteAllText('.claude/settings.json', 'x')", "[System.IO.File]::Delete('CLAUDE.md')",
    'Copy-Item novo.md CLAUDE.md', 'Move-Item .claude/hooks/kit.mjs velho.mjs', 'Rename-Item CLAUDE.md x.md',
    'Remove-Item -Recurse -Force .claude', 'cp x.md .\\.claude\\hooks\\kit.mjs', 'sc CLAUDE.md x',
    'Get-Content x.md | Set-Content CLAUDE.md', `rm -r ${PASTA_GLOB_INICIO}`, 'Remove-Item -LiteralPath:CLAUDE.md',
  ]) {
    const r = decidirPs(cmd);
    assert.equal(r.acao, 'deny', cmd);
    assert.match(r.motivo, /PowerShell/, cmd);
    assert.equal(decidirPs(cmd, { template: true }).acao, 'allow', `template: ${cmd}`);
  }
});

test('PowerShell: leitura, escrita fora da zona e extensão do projeto passam', () => {
  for (const cmd of [
    'Get-Content CLAUDE.md', 'Get-Content .claude/hooks/kit.mjs 2>$null', 'Select-String RF- .claude/skills -r',
    'Remove-Item outputs/x.md', 'Set-Content outputs/spec/a.md x', 'Copy-Item a.md .claude/rules/meu.md',
    'git status', 'node --test .claude/hooks/kit.test.mjs > saida.txt', 'Test-Path .harness-template',
  ]) {
    assert.equal(decidirPs(cmd).acao, 'allow', cmd);
  }
  assert.equal(decidirPs("Set-Content .claude/agents/meu.md 'x'", { manifesto: MANIFESTO }).acao, 'allow');
  assert.equal(decidirPs("Set-Content .claude/agents/corretor.md 'x'", { manifesto: MANIFESTO }).acao, 'deny');
});

test('PowerShell: comando sem caminho protegido não paga a detecção do template', () => {
  for (const cmd of ['Get-ChildItem', 'Remove-Item outputs/x.md', "'x' > saida.txt"]) {
    const io = ioFalso({ template: true });
    despachar(ps(cmd), criarRegistro(io));
    assert.equal(io.chamadas.filter((c) => c[0] === 'ehTemplate').length, 0, cmd);
  }
});

// ————————————————————— PowerShell: o alvo da escrita, por instrução —————————————————————
//
// A regra grossa — verbo de escrita em QUALQUER ponto do comando + caminho da zona em QUALQUER ponto
// — negava num CLONE o fluxo diário das skills: criar a pasta de saída e rodar o `cli.mjs` da skill
// na mesma linha, copiar o template da skill para `outputs/`, mandar a saída do `node --test` para
// um arquivo. No template a trava abre pelo marcador, e por isso ninguém viu. Todos os casos daqui
// para baixo rodam como CLONE (a dublê sem `template: true`), que é onde a trava morde.

test('PowerShell: o fluxo das skills num clone passa, e mencionar a zona fora do alvo não paga a detecção', () => {
  for (const cmd of [
    'New-Item -ItemType Directory -Force outputs/spec/estimate-report; node .claude/skills/spec-estimate-report/cli.mjs --data outputs/spec/estimate-report/report-data.json',
    'node .claude/ferramentas/validar.mjs avancar --task 12 | Tee-Object -FilePath outputs/spec/validacao/log.txt',
    'Copy-Item .claude/skills/spec-estimate-report/templates/report-data.example.json outputs/spec/estimate-report/report-data.json',
    'node --test .claude/hooks/ 2>&1 | Out-File outputs/test.txt',
    'Remove-Item -Recurse -Force outputs/spec/validacao/12; node .claude/ferramentas/validar.mjs iniciar --task 12',
    "Select-String -Path CLAUDE.md -Pattern 'zona' | Out-File outputs/x.txt",
    'mkdir outputs/spec/tech-rules -Force; python .claude/skills/spec-tech-rules/tools/mdc_to_md.py --dir outputs/spec/tech-rules .claude/rules',
    "git add outputs/; git commit -m 'feat: copy CLAUDE.md rules'",
    // O `*` resolve a partir da pasta do `Set-Location`, e não da raiz — antes ele casava `CLAUDE.md`.
    'Set-Location outputs/spec/tmp; Remove-Item * -Recurse',
  ]) {
    const io = ioFalso();
    const r = despachar(ps(cmd), criarRegistro(io));
    assert.equal(r.acao, 'allow', `${cmd}\n${r.motivo || ''}`);
    assert.equal(io.chamadas.filter((c) => c[0] === 'ehTemplate').length, 0, `pagou a detecção: ${cmd}`);
  }
});

test('PowerShell: leitura noutro estágio, noutra instrução ou dentro de texto não vira escrita', () => {
  for (const cmd of [
    'Get-Content CLAUDE.md | Set-Content outputs/copia.md', // era o falso positivo declarado e aceito
    'Copy-Item .claude/rules/harness/security.md outputs/spec/security.md', // origem de cópia é leitura
    'Get-ChildItem .claude/hooks | Select-Object Name | Out-File outputs/lista.txt',
    'python -I .claude/skills/tools/check-outputs.py outputs/spec | tee outputs/check.txt',
    'node .claude/skills/spec-tasks-html/cli.mjs --out outputs/spec/tasks.html; if ($?) { Copy-Item outputs/spec/tasks.html docs/ }',
    "Get-ChildItem -Recurse -Filter *.md outputs | ForEach-Object { (Get-Content $_.FullName) -replace 'x','y' | Set-Content $_.FullName }",
    "Write-Output 'Remove-Item CLAUDE.md; rm -r .claude'",
    "@'\nRemove-Item CLAUDE.md\n'@ | Out-File outputs/nota.txt",
    'Set-Location .claude; Get-ChildItem; Set-Location ..; Remove-Item hooks-velho -Recurse',
    'Push-Location outputs; Remove-Item * -Recurse; Pop-Location; Get-Content CLAUDE.md',
    "$saida = 'outputs/x.md'; Get-Content CLAUDE.md | Set-Content $saida",
    'Rename-Item outputs/rascunho.md CLAUDE.md', // o nome novo fica na pasta da origem: outputs/
    'Move-Item outputs/a.md outputs/arquivo/',
    'Get-ChildItem .claude/hooks | Copy-Item -Destination outputs/backup/',
  ]) {
    const r = decidirPs(cmd);
    assert.equal(r.acao, 'allow', `${cmd}\n${r.motivo || ''}`);
  }
});

test('PowerShell: escrita que alcança a zona continua negada no clone, e passa no template', () => {
  for (const cmd of [
    // pipeline que alimenta verbo destrutivo, ou escritor sem alvo próprio, pelo pipe
    'Get-ChildItem .claude -Recurse | Remove-Item',
    'Get-ChildItem .claude/hooks | ForEach-Object { Remove-Item $_ }',
    'Get-ChildItem .claude/skills/spec-tasks -Recurse | ForEach-Object { $_.Delete() }',
    'Get-ChildItem .claude/hooks | Set-Content -Value x',
    'Get-ChildItem -Recurse -Filter *.md | Remove-Item', // sem caminho, a listagem é a pasta em vigor
    'foreach ($f in Get-ChildItem .claude/hooks) { Remove-Item $f }',
    // Set-Location / Push-Location: o relativo e o glob resolvem a partir da pasta nova
    'Set-Location .claude; Remove-Item hooks -Recurse',
    'cd .claude/hooks; Remove-Item kit.mjs',
    `Set-Location ${PASTA}; Remove-Item * -Recurse`,
    "Push-Location .claude/hooks; Set-Content kit.mjs 'x'; Pop-Location",
    "Set-Location .claude/hooks; 'x' > kit.mjs",
    'Set-Location outputs; New-Item ../.harness-template',
    'Set-Location .claude; Set-Location $x; Remove-Item CLAUDE.md', // pasta irresolvível volta à raiz
    // destino de cópia, origem e destino de Move
    'Copy-Item x.md .claude/rules/harness/security.md',
    'Copy-Item -Destination .claude/hooks/kit.mjs -Path x.mjs',
    'Copy-Item outputs/CLAUDE.md .', // destino pasta: o arquivo cai com o nome da origem
    'Move-Item .claude/hooks/a.mjs outputs/',
    'Move-Item outputs/x.mjs .claude/hooks/',
    'Rename-Item x.md CLAUDE.md',
    // escritores, alvo nomeado, lista, glob, instrução depois de outra
    "'x' | Out-File CLAUDE.md",
    "Set-Content -Path .claude/settings.json -Value '{}'",
    `Remove-Item -Recurse ${PASTA_GLOB_INICIO}`,
    'Remove-Item a.md, CLAUDE.md',
    'node x.mjs; Remove-Item -Force CLAUDE.md',
    'New-Item -Path . -Name .harness-template',
    // bloco, subexpressão, membro .NET, variável com literal, $PWD, cmd /c
    'if ($true) { Remove-Item CLAUDE.md }',
    'Remove-Item (Get-ChildItem .claude/hooks)',
    '(Get-Item CLAUDE.md).Delete()',
    "$alvo = '.claude/hooks/kit.mjs'; Remove-Item $alvo",
    "[IO.File]::WriteAllText(\"$PWD\\CLAUDE.md\", 'x')",
    'cmd /c del CLAUDE.md',
  ]) {
    const r = decidirPs(cmd);
    assert.equal(r.acao, 'deny', cmd);
    assert.match(r.motivo, /PowerShell/, cmd);
    assert.equal(decidirPs(cmd, { template: true }).acao, 'allow', `template: ${cmd}`);
  }
});

test('PowerShell: a mensagem nomeia o alvo e o verbo, e a do pipeline diz que o pipe alimenta o verbo', () => {
  const alvo = decidirPs('Set-Location .claude; Remove-Item hooks -Recurse');
  assert.match(alvo.motivo, /`Remove-Item`/);
  assert.match(alvo.motivo, /\.claude\/hooks/);
  const pipe = decidirPs('Get-ChildItem .claude/hooks | Remove-Item');
  assert.match(pipe.motivo, /pipeline/i);
  assert.match(pipe.motivo, /`Remove-Item`/);
});

test('PowerShell: leitura quebrada (aspa ou grupo que não fecha) volta à regra grossa', () => {
  for (const cmd of ["Remove-Item CLAUDE.md 'oops", 'Remove-Item (Get-ChildItem .claude/hooks']) {
    const r = decidirPs(cmd);
    assert.equal(r.acao, 'deny', cmd);
    assert.match(r.motivo, /não fecha/, cmd);
  }
  // sem verbo de escrita a regra grossa continua livre
  assert.equal(decidirPs("Get-Content CLAUDE.md 'oops").acao, 'allow');
});

test('PowerShell: num clone de verdade, manifesto e marcador no disco não abrem a trava', () => {
  // A Decisão 67 vista pelo PowerShell, com a casca de produção: o marcador criado à mão num clone
  // (que tem o manifesto) não é chave, e a leitura por alvo não abre fresta nova.
  const raiz = realpathSync.native(mkdtempSync(join(tmpdir(), 'eb-ps-clone-')));
  writeFileSync(join(raiz, 'harness-zona.lock.json'), '{}');
  writeFileSync(join(raiz, '.harness-template'), '');
  const registro = criarRegistro({ ...IO_REAL, cwd: () => raiz }).filter((v) => v.nome === 'escrita-powershell');
  for (const cmd of ['Remove-Item CLAUDE.md', 'Set-Location .claude; Remove-Item hooks -Recurse',
    'Remove-Item .harness-template', 'Get-ChildItem .claude | Remove-Item -Recurse']) {
    assert.equal(despachar(ps(cmd), registro).acao, 'deny', cmd);
  }
  assert.equal(despachar(ps('Copy-Item .claude/skills/x/t.json outputs/t.json'), registro).acao, 'allow');
});

test('PowerShell: todo verbo da regra grossa tem gramática de alvo na leitura por instrução', () => {
  // As duas listas falam dos mesmos verbos. Um alias novo na grossa sem gramática seria um verbo que
  // a leitura por alvo não reconhece — e passaria livre em todo comando que fecha as aspas.
  for (const verbo of mod.VERBOS_DE_ESCRITA_POWERSHELL) {
    const canon = Object.hasOwn(mod.ALIASES_POWERSHELL, verbo) ? mod.ALIASES_POWERSHELL[verbo] : verbo;
    assert.ok(Object.hasOwn(mod.ALVOS_POWERSHELL, canon), `${verbo} → ${canon} sem gramática`);
  }
});

test('PowerShell: os falsos negativos declarados continuam passando — fechar um exige atualizar o topo da seção', () => {
  for (const cmd of [
    "$f = 'CLAU' + 'DE.md'; Remove-Item $f", // caminho montado
    'Remove-Item $env:ALVO', // variável vinda de fora do comando
    'Remove-Item @parametros', // splatting
    'git checkout -- .claude/hooks', // git que reescreve: a trava do Bash pega, esta não
    "bash -c 'rm -rf .claude'",
    "node -e \"require('fs').rmSync('CLAUDE.md')\"",
  ]) {
    assert.equal(decidirPs(cmd).acao, 'allow', cmd);
  }
});

test('PowerShell: a leitura não lança nem trava em texto malformado — o hook roda em toda chamada', () => {
  // Exceção num bloqueante vira deny de TODO comando PowerShell (falha fechada), e laço que não
  // avança trava a sessão. Gerador determinístico para a falha, se vier, ser reproduzível.
  const pedacos = ['a', '-', '$', '(', ')', '{', '}', '"', "'", '`', '|', ';', '&', '>', '#', '<#', '@', ',',
    ' ', '\n', '.', '/', '\\', '*', 'CLAUDE.md', '.claude/hooks', 'Remove-Item ', 'Set-Location ', '=',
    '[IO.File]::Delete', '.Delete', "@'\n", "\n'@", '$(', '2>', '-Path:', 'cmd /c ', '$x = '];
  let semente = 20261021;
  const proximo = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente; };
  for (let n = 0; n < 3000; n++) {
    let cmd = '';
    const tamanho = proximo() % 24;
    for (let k = 0; k < tamanho; k++) cmd += pedacos[proximo() % pedacos.length];
    assert.doesNotThrow(() => mod.lerPowerShell(cmd), JSON.stringify(cmd));
    const r = decidirPs(cmd);
    assert.ok(r.acao === 'allow' || /PowerShell/.test(r.motivo), `${JSON.stringify(cmd)} → ${r.motivo}`);
  }
});
