// Harness Elo v2 — O arquivo que cada validador e o corretor leem. Núcleo puro, sem I/O.
//
// Um arquivo só, com tudo: a task, as perguntas, o recorte do código e o formato da resposta. O
// agente faz UMA leitura e responde — cada leitura a mais é uma volta inteira de contexto reenviado.
// O agente que orquestra nunca vê este conteúdo: ele passa só o caminho.

import { NOVOS_POR_GRUPO } from './guarda.mjs';

const corta = (s, n) => {
  const t = String(s ?? '').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Blocos de texto → lotes que cabem no limite. Bloco maior que o limite é partido por linhas. */
export function montarLotes(blocos, limite) {
  const pedacos = [];
  for (const b of blocos) {
    if (b.length <= limite) { pedacos.push(b); continue; }
    const [cabeca, ...linhas] = b.split('\n');
    let atual = cabeca;
    for (const l of linhas) {
      if (atual.length + l.length + 1 > limite && atual !== cabeca) {
        pedacos.push(atual);
        atual = `${cabeca} (continuação)`;
      }
      atual += `\n${l}`;
    }
    pedacos.push(atual);
  }
  const lotes = [];
  let atual = [];
  let tamanho = 0;
  for (const p of pedacos) {
    if (atual.length && tamanho + p.length > limite) { lotes.push(atual); atual = []; tamanho = 0; }
    atual.push(p);
    tamanho += p.length + 2;
  }
  if (atual.length) lotes.push(atual);
  return lotes.map((l) => l.join('\n\n'));
}

const FORMATO = `{
  "dimensao": "<a sua dimensão, exatamente como no título>",
  "verificacoes": [
    { "id": "<id do item>", "veredito": "CUMPRE | NAO_CUMPRE | INCERTO", "motivo": "<uma frase>",
      "evidencia": { "arquivo": "<caminho>", "linha": 42, "trecho": "<texto copiado do arquivo>" } }
  ],
  "achados": [
    { "titulo": "<o problema em poucas palavras>", "severidade": "CRITICO | ALTO",
      "motivo": "<o que acontece de errado>", "correcao": "<o que mudar>",
      "evidencia": { "arquivo": "<caminho>", "linha": 42, "trecho": "<texto copiado do arquivo>" } }
  ]
}`;

/**
 * O formato de quem não tem perguntas a responder: só achados, que carregam severidade. Verificação
 * mandada assim mesmo vira aviso na consolidação (ver `dimensoesComPerguntas` no `consolidar.mjs`).
 */
const FORMATO_SO_ACHADOS = FORMATO.replace(/"verificacoes": \[[\s\S]*?\n {2}\],/, '"verificacoes": [],');

/**
 * Trechos de rule numa cerca de til: as rules têm blocos de código com crase, que fechariam uma cerca
 * de crase no meio do texto.
 */
function blocoDeRules(rules, aviso) {
  return rules ? ['', '## Rules que valem aqui (trechos)', '', aviso, '', '~~~~markdown', rules, '~~~~'] : [];
}

/** Texto de entrada de um validador. */
export function textoParaValidador({
  dimensao, task, perguntas = [], jaVerificado = [], jaAchado = [], recorte, lote = 1, totalLotes = 1, rodada, caminhoResultado,
  repo = '', rules = '', revalidacao = null,
}) {
  const partes = [
    `# Validação — ${dimensao} — ${task.id} (rodada ${rodada}${totalLotes > 1 ? `, lote ${lote} de ${totalLotes}` : ''})`,
    '',
    'Siga as instruções da sua definição de agente. **Responda em um turno, com o que está neste arquivo**:',
    'o número de cada linha do recorte é o do arquivo, e a evidência é conferida no disco por código. Abra',
    'outro arquivo só se o código que decide um item não estiver aqui — no máximo um.',
    // Medido na calibração: sem a pasta, o validador procurou `src/...` a partir da raiz do harness e
    // foi parar no código-fonte da fixture — a dois passos do gabarito dela.
    ...(repo ? ['', `**Pasta do código:** \`${repo}\`. Os caminhos do recorte são relativos a ela. Não abra código fora dela.`] : []),
    ...(totalLotes > 1 ? ['', '**Este é um lote:** o código desta entrega não coube num arquivo só. Se o código que decide um item não está aqui, responda INCERTO com o motivo "fora deste lote".'] : []),
    '',
    '## A task',
    `**${task.id} — ${task.title || ''}**`,
    '',
    corta(task.description, 1200),
  ];
  // Revalidação depois de uma correção: o recorte traz só os arquivos que a correção tocou ou que
  // têm item aberto, e as perguntas já resolvidas em arquivo que ninguém mexeu ficam de fora.
  if (revalidacao) {
    partes.push('', '## Esta é uma revalidação',
      '', 'O corretor mexeu no código. O recorte abaixo traz **só** os arquivos que ele tocou e os que têm item em aberto.',
      'As linhas marcadas com `*` foram mudadas por ele nesta rodada: é **só nelas** que se procura problema novo.');
    if (revalidacao.abertos.length) {
      partes.push('', '### Em aberto da rodada anterior', '',
        'Para cada um: se continua, reporte de novo com o **mesmo título** (ou o mesmo id, se for verificação); se foi resolvido, não reporte.', '');
      for (const a of revalidacao.abertos) partes.push(`- ${a.onde ? `\`${a.onde}\` — ` : ''}${a.rotulo}: ${corta(a.motivo, 240)}`);
    }
    if (revalidacao.resolvidas.length) {
      partes.push('', `Já resolvidas antes, em código que a correção não tocou (não responda): ${revalidacao.resolvidas.map((id) => `\`${id}\``).join(', ')}.`);
    }
  }
  if (perguntas.length) {
    partes.push('', '## O que verificar', '', 'Uma verificação para CADA item, com o mesmo id:', '');
    for (const p of perguntas) partes.push(`- \`${p.id}\` (${p.origem}) — ${p.texto}`);
  }
  if (jaVerificado.length) {
    partes.push('', '## Já verificado por código (não repita)', '');
    for (const v of jaVerificado) partes.push(`- \`${v.id}\`: ${v.veredito} — ${v.motivo}`);
  }
  if (jaAchado.length) {
    partes.push('', '## Já achado por código (não repita)', '',
      'Estes problemas já bloqueiam a entrega e vão para o corretor. Não os reporte de novo: procure o que regra fixa não pega.', '');
    for (const a of jaAchado) partes.push(`- \`${a.evidencia.arquivo}:${a.evidencia.linha}\` — ${a.titulo} (${a.severidade})`);
  }
  partes.push(...blocoDeRules(rules,
    'Já recortados para você: não abra a rule.'));
  partes.push(
    '', '## O código desta entrega', '',
    revalidacao
      ? 'Cada linha: número no arquivo, marca (`*` mudada pela correção, `+` acrescentada pela entrega, espaço = contexto, `-` removida) e o texto.'
      : 'Cada linha: número no arquivo novo, marca (`+` acrescentada, espaço = contexto, `-` removida) e o texto.',
    '', '```', recorte || '(nenhum arquivo desta dimensão mudou)', '```',
    '', '## Como responder', '',
    `Grave **um** arquivo JSON em \`${caminhoResultado}\` e responda só com a linha \`ok ${caminhoResultado}\`.`,
    '', '```json', (perguntas.length ? FORMATO : FORMATO_SO_ACHADOS).replace('<a sua dimensão, exatamente como no título>', dimensao), '```', '',
    ...(perguntas.length
      ? ['- **CUMPRE exige evidência**: o trecho copiado do arquivo, sem a moldura do recorte (sem número nem `+|`).',
        '- **Na dúvida, INCERTO.** Nunca CUMPRE sem ter visto o código que cumpre.']
      : ['- **Deixe `verificacoes` vazia.** Não há perguntas a responder: tudo que você achar vai em `achados`, com a severidade. Verificação mandada assim mesmo não bloqueia nada: vira aviso.']),
    '- **Só CRITICO e ALTO.** O que seria MEDIO ou BAIXO não entra na resposta: é ignorado de qualquer forma.',
    '- Achado só com evidência, copiada do arquivo sem a moldura do recorte. `trecho` com no máximo 300 caracteres.',
    '- Nada de achado de outra dimensão: cada dimensão tem o seu validador.',
  );
  return partes.join('\n');
}

/** Quantos arquivos da entrega a seção "Escopo" lista por extenso; o resto vai resumido. */
const ESCOPO_LISTADO = 60;

/**
 * Texto de entrada do corretor, para um grupo de bloqueantes. `escopo` — o que o grupo pode mudar: os
 * arquivos dos itens ou, no grupo sem arquivo (comando que falhou), os arquivos da entrega (13.2).
 */
export function textoParaCorretor({ task, grupo, numero, total, rodada, caminhoRegistro, comandos = {}, repo = '', rules = '', escopo = null }) {
  const cmds = Object.entries(comandos).filter(([, c]) => c);
  const semArquivo = !(grupo.arquivos || []).length;
  const podeMudar = escopo || grupo.arquivos || [];
  const partes = [
    `# Correção — ${task.id} — rodada ${rodada}, grupo ${numero} de ${total}`,
    '',
    'Corrija SÓ os itens abaixo. Para cada um: escreva primeiro o teste que falha por causa do defeito,',
    'rode e veja falhar; corrija; rode de novo e veja passar.',
    '',
    ...(repo ? [`**Pasta do código:** \`${repo}\` — rode os comandos a partir dela.`] : []),
    ...(cmds.length
      ? ['**Comandos do projeto:**', ...cmds.map(([rotulo, c]) => `- ${rotulo}: \`${c}\``)]
      : ['**Comandos do projeto:** nenhum foi informado — descubra o comando de teste no `package.json` (ou equivalente) e diga qual usou no registro.']),
    '',
    '**Não altere** o `tasks.json`, nada em `outputs/spec/` e nada em `.claude/`: a rodada é recusada se',
    'esses arquivos mudarem. Não declare nada como corrigido — quem decide é a próxima validação.',
    '',
    '## Escopo',
    '',
    ...(semArquivo
      ? ['O item não aponta arquivo (um comando falhou, ou a regra não tem evidência). O escopo é a **entrega**:',
        'você pode mudar só os arquivos que esta task já mudou —']
      : ['Você pode mudar **só**:']),
    ...podeMudar.slice(0, ESCOPO_LISTADO).map((a) => `- \`${a}\``),
    ...(podeMudar.length > ESCOPO_LISTADO ? [`- e mais ${podeMudar.length - ESCOPO_LISTADO} arquivo(s) que a task já mudou (\`git diff\` da task e os novos);`] : []),
    '- os arquivos de teste;',
    `- e criar no máximo ${NOVOS_POR_GRUPO} arquivos novos (fora os de teste).`,
    '',
    'Qualquer outro arquivo que mudar recusa a rodada. Se a correção exige mexer em outro arquivo ou',
    'refatorar a arquitetura, **não corrija**: registre `"feito": "não corrigido: exige refatoração — <o que>"`.',
    '**Manifesto e lock de dependência** (`package.json`, lock, `pom.xml`, `requirements.txt`…) **nunca**:',
    'dependência nova é decisão humana — registre `"feito": "não corrigido: exige dependência — <qual>"`.',
    'Uma pessoa decide.',
    '',
    '## Itens',
  ];
  grupo.itens.forEach((it, i) => {
    const titulo = it.titulo || it.id;
    const nivel = it.severidade ? `, ${it.severidade}` : '';
    partes.push('', `### ${i + 1}. ${titulo} (${it.dimensoes ? it.dimensoes.join(' + ') : it.dimensao}${nivel})`, `- Chave: \`${it.chave}\``);
    if (it.evidencia) partes.push(`- Onde: \`${it.evidencia.arquivo}:${it.evidencia.linha}\` — \`${corta(it.evidencia.trecho, 200)}\``);
    partes.push(`- Problema: ${it.motivo}`);
    if (it.correcao) partes.push(`- Correção sugerida: ${it.correcao}`);
    // Com linha de base (13.1): o que o comando já fazia falhar antes da task não é deste item.
    if (it.novas && it.novas.length) {
      partes.push('- Linhas de falha que não estavam antes da task (a linha de base do comando já tinha as outras — não são suas):',
        '```', ...it.novas, '```');
    }
    if (it.saida) partes.push('- Saída do comando:', '```', it.saida, '```');
  });
  // Medido na calibração: três dos quatro bloqueantes da rodada 2 estavam em código que o próprio
  // corretor escreveu. Arquivo novo é validado como qualquer outro — as rules valem para ele também.
  partes.push(...blocoDeRules(rules,
    'Valem para o código que você mudar E para todo arquivo novo que criar: a próxima validação confere os dois.'));
  partes.push(
    '', '## Como responder', '',
    `Grave em \`${caminhoRegistro}\` um JSON e responda só \`ok ${caminhoRegistro}\`:`,
    '', '```json',
    '{ "itens": [ { "chave": "<chave do item>", "feito": "<o que mudou, uma frase>", "teste": "<arquivo::nome do teste>" } ] }',
    '```',
  );
  return partes.join('\n');
}
