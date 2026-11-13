// load-dotenv.mjs — carrega .env sem dependências.
//
// Ordem de procura (a primeira que existir ganha; as demais complementam variáveis
// ainda não definidas):
//   1. <skill>/.env                       — .env próprio desta skill
//   2. <skill>/../spec-tasks-azure/.env   — reaproveita as credenciais já configuradas
//   3. <root>/.env                        — .env do repositório do projeto
//
// Variáveis já presentes em process.env sempre vencem (permite override em CI).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(HERE, "..");

export function loadDotenv(root = process.cwd()) {
  const candidates = [
    join(SKILL_DIR, ".env"),
    join(SKILL_DIR, "..", "spec-tasks-azure", ".env"),
    join(root, ".env"),
  ];
  const loaded = [];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    let raw;
    try { raw = readFileSync(file, "utf8"); } catch { continue; }
    let applied = 0;
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(t);
      if (!m) continue;
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[m[1]] === undefined || process.env[m[1]] === "") {
        process.env[m[1]] = value;
        applied++;
      }
    }
    loaded.push({ file, applied });
  }
  return loaded;
}

export { SKILL_DIR };
