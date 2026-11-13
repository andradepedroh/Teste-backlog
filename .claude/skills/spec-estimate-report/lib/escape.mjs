// Escapes mínimos para contexto HTML (título e marca injetados no shell).
export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

// Serializa o payload de forma segura para dentro de <script type="application/json">.
// `<` vira < — o JSON.parse do cliente decodifica de volta, e nenhum </script>
// consegue fechar o bloco prematuramente.
export function scriptSafeJson(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
