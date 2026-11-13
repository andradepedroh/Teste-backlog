// lacunas-teste-md.mjs — a aba «O que falta testar» em Markdown, para entregar ao time.
//
// Sai do MESMO bloco `testGaps` que a aba renderiza, pelo CLI (`--export-test-gaps-md`).
// É melhor do que o agente escrever o documento à parte: duas redações do mesmo conteúdo
// divergem, e a que diverge é a que o time vai ler.

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { ACTIONS, ACTION_ORDER, IMPL_LABEL, LAYER_LABEL, PRIORITY_LABEL, PRIORITY_ORDER, SITUATION_LABEL } from "./lacunas-teste.mjs";
import { fmtDate, fmtPct, nf } from "./render-shared.mjs";

/** Marca da primeira linha: só arquivo com ela é sobrescrito pelo CLI. */
export const MD_MARKER = "<!-- gerado por spec-status-report a partir de test-gaps.json (--export-test-gaps-md); edite a análise, não este arquivo -->";

const cell = (s) => String(s ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();

/** Data local de hoje, AAAA-MM-DD — o nome do arquivo é lido por gente, no fuso dela. */
export function localDateStamp(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Caminho de gravação. Se já existe um arquivo com esse nome que NÃO foi gerado pelo CLI
 * (sem a marca na primeira linha), o export vai para `-cli.md` ao lado, em vez de
 * apagar o que alguém escreveu à mão.
 */
export function exportTarget(dir, stamp = localDateStamp()) {
  const primary = join(dir, `testes-a-criar-${stamp}.md`);
  if (!existsSync(primary)) return { path: primary, replaced: false, diverted: false };
  let head = "";
  try { head = readFileSync(primary, "utf8").split(/\r?\n/, 1)[0]; } catch { /* segue */ }
  if (head.trim() === MD_MARKER) return { path: primary, replaced: true, diverted: false };
  return { path: join(dirname(primary), basename(primary, ".md") + "-cli.md"), replaced: false, diverted: true, kept: primary };
}

export function renderTestGapsMarkdown(g, { projectName = null, generatedAt = null } = {}) {
  if (!g || !g.available) return null;
  const cur = g.curated;
  const rich = Boolean(cur && cur.analyzed);
  const L = [MD_MARKER, "", "# Testes a criar — regras e requisitos sem teste automatizado", ""];

  L.push([
    projectName ? `**Projeto:** ${projectName}` : null,
    `**Coleta:** ${fmtDate(generatedAt)}`,
    cur ? `**Análise item a item:** ${cur.generatedAt ? fmtDate(cur.generatedAt) : "data não declarada"}${cur.basis ? ` (base: ${cur.basis})` : ""}` : "**Análise item a item:** ausente — leitura reduzida",
  ].filter(Boolean).join(" · "), "");
  if (cur && cur.stale) L.push(`> **A análise pode estar desatualizada:** ${cur.staleReasons.join("; ")}. Confira antes de distribuir.`, "");

  L.push("## 1. Por que este documento existe", "");
  L.push(`A cobertura de regras e requisitos está em **${fmtPct(g.coverage.current)}%**: ${nf(g.totals.withTest)} de ${nf(g.totals.matrix)} itens de negócio têm teste automatizado. Este documento diz o que fazer com os outros **${nf(g.totals.withoutTest)}**.`, "");
  L.push("**Atenção à leitura do número.** A matriz de rastreabilidade conta um item como testado quando o código dele aparece no nome de um teste (ou num comentário do arquivo de teste). Ela não lê o que o teste faz. Por isso um item pode estar aqui mesmo já tendo um teste que confere o comportamento — nesse caso, falta só marcar o código no teste.", "");
  if (!rich) {
    L.push("> **Leitura reduzida.** Não há análise item a item (`status/test-gaps.json`). A lista abaixo vem só da matriz: o relatório sabe que nenhum teste cita o código do item, mas não verificou onde a regra está nem quais testes criar.", "");
  }

  if (rich) {
    L.push("## 2. O que fazer", "", "| Ação | Itens |", "|---|---:|");
    for (const k of ACTION_ORDER) if (g.actions[k]) L.push(`| ${ACTIONS[k].label} | ${nf(g.actions[k])} |`);
    L.push("");
    if (g.projection) {
      const pj = g.projection;
      L.push(`Com as ${nf(pj.markId)} marcações e os ${nf(pj.create)} testes novos, a cobertura de regras e requisitos sobe de **${fmtPct(pj.current)}%** para **${fmtPct(pj.projected)}%** (${nf(pj.projectedCount)} de ${nf(pj.total)}). Os itens que dependem de implementação ficam fora da conta.`, "");
    }
    L.push("## 3. Prioridade e área", "", "| Prioridade | Itens |", "|---|---:|");
    for (const k of PRIORITY_ORDER) if (g.priorities[k]) L.push(`| ${PRIORITY_LABEL[k]} | ${nf(g.priorities[k])} |`);
    L.push("");
    const cols = PRIORITY_ORDER.filter((k) => g.areas.some((a) => a[k]));
    L.push(`| Área | Itens | ${cols.map((k) => PRIORITY_LABEL[k]).join(" | ")} |`, `|---|---:|${cols.map(() => "---:").join("|")}|`);
    for (const a of g.areas) L.push(`| ${cell(a.name)} | ${nf(a.total)} | ${cols.map((k) => nf(a[k] || 0)).join(" | ")} |`);
    L.push(`| **Total** | **${nf(g.totals.withoutTest)}** | ${cols.map((k) => `**${nf(g.priorities[k] || 0)}**`).join(" | ")} |`, "");
  } else {
    L.push("## 2. Por área", "", "| Área | Itens | Implementados | Só no backlog | Sem vínculo |", "|---|---:|---:|---:|---:|");
    for (const a of g.areas) L.push(`| ${cell(a.name)} | ${nf(a.total)} | ${nf(a.implemented || 0)} | ${nf(a.planned || 0)} | ${nf(a.unmapped || 0)} |`);
    L.push("");
  }

  const n = rich ? 4 : 3;
  L.push(`## ${n}. Regra para o teste contar`, "", "O nome do teste precisa **começar pelo código do item**. Sem o código, a matriz não liga o teste à regra.", "");
  L.push("Java (JUnit 5), no `@DisplayName`:", "", "```java", "@Test", `@DisplayName("${g.exampleId} — quando o pedido está completo, o sistema aceita")`, "void aceitaPedidoCompleto() { … }", "```", "");
  L.push("JavaScript e TypeScript (Vitest, Jest, Playwright), no título do `it` ou do `test`:", "", "```ts", `it("${g.exampleId} — quando falta um campo obrigatório, o sistema recusa", () => { … });`, "```", "");

  let k = n + 1;
  if (g.doneWithoutCode.length || g.contradictingTests.length) {
    L.push(`## ${k++}. Achados que vão além dos testes`, "");
    if (g.doneWithoutCode.length) {
      L.push("**Resolvidos sem código** — não há teste a criar; vale registrar como o item foi atendido.", "", "| Item | O que a análise encontrou |", "|---|---|");
      for (const d of g.doneWithoutCode) L.push(`| ${d.id} — ${cell(d.title)} | ${cell(d.notes.join("; "))} |`);
      L.push("");
    }
    if (g.contradictingTests.length) {
      L.push("**Testes que afirmam o contrário da regra** — passar neles não prova que a regra está atendida.", "", "| Teste | Regra | O que diverge |", "|---|---|---|");
      for (const c of g.contradictingTests) L.push(`| \`${cell(c.test)}\` | ${cell(c.rule || "—")} | ${cell(c.text || "")} |`);
      L.push("");
    }
  }
  const poTotal = g.poQuestions.reduce((a, x) => a + x.items.length, 0);
  if (poTotal) {
    L.push(`## ${k++}. Pontos a confirmar com o Dono do Produto`, "");
    for (const a of g.poQuestions) {
      L.push(`**${a.area}**`, "");
      for (const q of a.items) L.push(`- ${q.text}${q.ids.length ? ` (${q.ids.join(", ")})` : ""}`);
      L.push("");
    }
  }

  L.push(`## ${k++}. Item a item`, "");
  let area = null;
  let mod = null;
  for (const it of g.items) {
    if (it.area !== area) { area = it.area; mod = null; L.push(`### ${area}`, ""); }
    if (it.moduleLabel !== mod && it.moduleLabel !== area) { mod = it.moduleLabel; L.push(`#### ${mod}`, ""); }
    const tags = it.curated ? `${PRIORITY_LABEL[it.priority || "none"]} · ${ACTIONS[it.action].short}` : "análise detalhada pendente";
    L.push(`##### ${it.id} — ${it.title}`, "", `*${tags}*`, "");
    if (it.rule) L.push(`- **O que a regra diz:** ${it.rule}`);
    else if (it.statement) L.push(`- **Texto da especificação:** ${it.statement}`);
    L.push(`- **Situação no código:** ${SITUATION_LABEL[it.situation] || it.situation}${it.implementation && (it.implementation.state || it.implementation.rawState) ? ` · implementação segundo a análise: ${IMPL_LABEL[it.implementation.state] || it.implementation.rawState}` : ""}`);
    if (it.implementation && it.implementation.where.length) {
      L.push("- **Onde está no código:**");
      for (const w of it.implementation.where) L.push(`  - \`${w.file}${w.line ? `:${w.line}` : ""}\`${w.role ? ` — ${w.role}` : ""}`);
    }
    if (it.codeRefs.length) L.push(`- **Arquivos que citam o código:** ${it.codeRefs.map((r) => `\`${r.file}${r.line ? `:${r.line}` : ""}\``).join(", ")}`);
    if (it.existingTest) {
      const e = it.existingTest;
      L.push(`- **Teste que já existe:** ${e.file ? `\`${e.file}\`` : ""}${e.test ? ` — \`${e.test}\`` : ""}${e.action === "mark-id" ? ` → pôr \`${it.id}\` no início do nome e completar os cenários` : ""}`);
    }
    if (it.testsToCreate.length) {
      L.push("- **Testes a criar:**");
      for (const t of it.testsToCreate) {
        L.push(`  - ${LAYER_LABEL[t.layer] || t.rawLayer || "camada não declarada"}${t.repo ? ` · ${t.repo}` : ""}${t.file ? ` · \`${t.file}\`` : ""}`);
        for (const s of t.scenarios) L.push(`    - ${s}`);
      }
    }
    if (it.priorityReason) L.push(`- **Por que esta prioridade:** ${it.priorityReason}`);
    if (it.poQuestions.length) L.push(`- **A confirmar com o Dono do Produto:** ${it.poQuestions.join(" · ")}`);
    if (it.doneWithoutCode.length) L.push(`- **Resolvido sem código:** ${it.doneWithoutCode.join(" · ")}`);
    if (!it.curated) L.push("- O relatório só sabe que nenhum teste cita este código: não verificou onde a regra está nem se algum teste já exercita o comportamento.");
    L.push("");
  }

  if (g.failing.length) {
    L.push("## Anexo — têm teste, mas o teste falha", "", "| Item | Falhando | Causa na triagem |", "|---|---:|---|");
    for (const f of g.failing) {
      const cause = f.causes.length ? f.causes.map((c) => `${c.label}${c.dependsOn ? ` (depende de: ${c.dependsOn})` : ""}`).join("; ") : (g.findingsPresent ? "nenhuma causa da triagem cita este código" : "sem triagem");
      L.push(`| ${f.id} — ${cell(f.title)} | ${nf(f.failed)} de ${nf(f.total)} | ${cell(cause)} |`);
    }
    L.push("");
  }
  return `${L.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}
