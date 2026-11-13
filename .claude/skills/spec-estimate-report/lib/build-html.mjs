import { esc, scriptSafeJson } from "./escape.mjs";

// Marcadores que o shell congelado carrega e que o build precisa preencher.
export const PLACEHOLDERS = ["__REPORT_TITLE__", "__BRAND_NAME__", "__BRAND_SUB__", "__PAYLOAD__"];

// Garante que o template é o shell congelado desta skill (e não uma versão defasada).
export function assertTemplate(template) {
  const missing = PLACEHOLDERS.filter((p) => !template.includes(p));
  if (missing.length) {
    throw new Error(
      "template do spec-estimate-report defasado/incompatível — faltam marcadores: " +
        missing.join(", ") +
        ". atualize o pacote de skills para materializar o template atual."
    );
  }
  if (!template.includes('id="payload"')) {
    throw new Error('template sem <script id="payload"> — não é o shell do spec-estimate-report');
  }
}

// Deriva título/marca do payload, com fallbacks genéricos (nunca vaza texto de outro projeto).
export function deriveHeader(meta = {}) {
  const projeto = meta.projeto || "Especificação";
  return {
    titulo: meta.tituloHtml || `${projeto} — Especificação`,
    marca: meta.marca || projeto,
    marcaSub: meta.marcaSub || "Especificação",
  };
}

// Injeta cabeçalho + payload no shell. Retorna o HTML final autocontido.
export function buildHtml(template, data) {
  assertTemplate(template);
  const { titulo, marca, marcaSub } = deriveHeader(data.meta);
  const payload = scriptSafeJson(data);

  let html = template
    .replace("__REPORT_TITLE__", () => esc(titulo))
    .replace("__BRAND_NAME__", () => esc(marca))
    .replace("__BRAND_SUB__", () => esc(marcaSub))
    .replace("__PAYLOAD__", () => payload);

  // rede de segurança pós-substituição: nenhum marcador pode sobreviver
  const leaked = PLACEHOLDERS.filter((p) => html.includes(p));
  if (leaked.length) {
    throw new Error("marcador não substituído no HTML final: " + leaked.join(", "));
  }
  if (html.length < 50000) {
    throw new Error(`HTML final suspeito de estar truncado (${html.length} bytes)`);
  }
  return html;
}
