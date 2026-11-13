import { readFileSync } from "node:fs";

export const PANES = ["negocio", "tecnica", "testes", "seguranca", "gaps", "backlog", "estimativa"];

// O que a aba Estimativa do shell congelado lê SEM guarda (`x.length`, `x.map`, `x.y.z`), com o valor
// vazio que a deixa abrir. Faltando um deles, a aba lançava TypeError ao abrir e o CLI saía com exit 0
// sem nenhum aviso (D59, teste ponta a ponta de 2026-10-21: `caminhoCritico.gargalos`). O shell não
// se edita (é congelado): o caminho ausente vira AVISO e entra vazio no dado que vai para o HTML.
const IA_VAZIA = { p50: {}, p85: {}, p95: {} }; // o shell lê ia.p50.dias quando `iaAssistida` existe
export const OBRIGATORIOS_ESTIMATIVA = [
  ["forecast", {}], ["forecast.p50", {}], ["forecast.p85", {}], ["forecast.p95", {}],
  ["forecast.iaAssistida", IA_VAZIA], ["forecast.iaAssistida.p50", {}], ["forecast.iaAssistida.p85", {}], ["forecast.iaAssistida.p95", {}],
  ["equipe", {}], ["equipe.composicao", []], ["indices", {}],
  ["caminhoCritico", {}], ["caminhoCritico.gargalos", []],
  ["porEpic", []], ["porOnda", []], ["sensibilidade", []], ["cocomo", {}], ["cocomo.fatores", []],
  ["custos", {}], ["custos.calendarioBRL", {}], ["custos.iaAssistidaBRL", {}], ["custos.esforcoPuroBRL", {}], ["custos.comparativoModos", {}],
  ["foraDoForecast", []], ["pendencias", []], ["recomendacoes", []], ["premissas", []],
];

const ehObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Completa (no próprio `data`) os caminhos de OBRIGATORIOS_ESTIMATIVA que faltam; devolve os avisos. */
export function completarObrigatorios(data) {
  const avisos = [];
  const E = data?.estimativa;
  if (!ehObjeto(E)) return avisos; // aba ausente: o aviso da aba já cobre
  for (const [caminho, vazio] of OBRIGATORIOS_ESTIMATIVA) {
    const partes = caminho.split(".");
    const pai = partes.slice(0, -1).reduce((o, k) => o?.[k], E);
    if (!ehObjeto(pai)) continue; // o pai faltou e já foi completado (ou não é objeto: aviso dele)
    const k = partes[partes.length - 1];
    const v = pai[k];
    const ok = Array.isArray(vazio) ? Array.isArray(v) : ehObjeto(v);
    if (ok) continue;
    avisos.push(`CAMPO_OBRIGATORIO: estimativa.${caminho} ${v === undefined ? "ausente" : "com tipo errado"} — a aba Estimativa o lê sem guarda e quebraria ao abrir; entrou vazio (${JSON.stringify(vazio)}) no HTML. Preencha no report-data.json (forecast e caminhoCritico saem do --montar com --estimate-calc)`);
    pai[k] = structuredClone(vazio);
  }
  return avisos;
}

// Lê e valida (levemente) o report-data.json. Falha só no que impediria o build;
// abas ausentes viram AVISO (a aba correspondente não renderiza), não erro fatal.
export function loadReportData(filePath) {
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch (e) {
    throw new Error(`não consegui ler o report-data.json em ${filePath}: ${e.message}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`report-data.json não é JSON válido (${filePath}): ${e.message}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("report-data.json deve ser um objeto JSON na raiz");
  }
  if (!data.meta || typeof data.meta !== "object") {
    throw new Error("report-data.json precisa de um objeto `meta` (projeto, geradoEm, totais, …)");
  }

  const warnings = [];
  for (const p of PANES) {
    if (!data[p] || typeof data[p] !== "object") {
      warnings.push(`aba "${p}" ausente ou vazia — ela não vai renderizar no relatório`);
    }
  }
  if (!data.meta.projeto) warnings.push('meta.projeto ausente — o título/marca cairão no fallback genérico');
  if (!data.meta.totais) warnings.push("meta.totais ausente — o rodapé e algumas faixas de métrica ficarão incompletos");
  warnings.push(...completarObrigatorios(data));

  return { data, warnings };
}
