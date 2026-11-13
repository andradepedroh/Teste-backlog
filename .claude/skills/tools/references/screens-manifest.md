# Contrato — `screens-manifest.json`

> **Contrato compartilhado — mora aqui, junto do produtor e dos consumidores.** Produtor: `spec-prototype` (gate WARNING `SCREENS_MANIFEST_EMITTED`). Consumidores: `spec-iterate` (colheita do protótipo), `spec-report` (visões por tela), `spec-tasks` (`uiContext.fields[]`).

Inventário **universal** de telas que qualquer protótipo (HTML puro, React, qualquer stack — inclusive gerado por skills custom de projeto) DEVE emitir em `outputs/spec/screens-manifest.json`. É o insumo da verificação «Colheita do protótipo» do `spec-iterate` — cross-check determinístico via `python3 ../tools/check-flowmap.py outputs/spec/flow-map.md --manifest outputs/spec/screens-manifest.json` (caminho relativo ao SKILL.md que invoca; ver [`paths.md`](paths.md)) — e das visões por tela do `spec-report`. Exemplo completo: [`screens-manifest.example.json`](screens-manifest.example.json).

## Campos

| Campo | Obrigatório | Regra |
|-------|-------------|-------|
| `screens[].route` | **sim — único** | Rota da tela, iniciando com `/`. Chave de match quando não há `id` |
| `screens[].id` | não | `TEL-xxx` do `flow-map.md`, quando o protótipo o conhece; sem `id`, o match do cross-check é por `route` |
| `version` | recomendado | Versão do contrato (atual: `1`) |
| `generatedBy` | recomendado | Skill ou ferramenta emissora (ex.: `spec-prototype/geracao`, `spec-iterate/colheita-runtime`) |
| `generatedAt` | recomendado | Timestamp ISO-8601 |
| `partial` | não | `true` quando gerado por colheita estática (melhor esforço) — acompanha `HARVEST_PARTIAL` no sync-log |
| `screens[].title` | não | Nome da tela |
| `screens[].fields[]` | não | `{name, type, required}` — `type` livre: `text\|number\|date\|select\|...` |
| `screens[].actions[]` | não | Rótulos das ações visíveis (botões/comandos, ex.: `"Salvar"`, `"Cancelar"`) |
| `screens[].states[]` | não | Estados de UI observáveis (ex.: `padrão`, `vazio`, `erro`, `carregando`) |
| `screens[].screenshot` | não | Caminho relativo a `outputs/spec/` — ver regra de screenshots abaixo |

## Regras

1. **`route` é obrigatória e única** no manifesto. **`id` é opcional** — quando o protótipo não conhece os `TEL-xxx`, o match é por `route`. Todos os demais campos são opcionais: emitir o que a stack conseguir inventariar (quanto mais campos, mais rica a colheita campo/ação/estado).
2. **Screenshots** — convenção única do kit ([`paths.md`](paths.md) § «Convenção de screenshots de tela»): o arquivo mora em `outputs/spec/screens/<TEL-ID>.png` e é citado aqui **relativo a `outputs/spec/`** → `screens/TEL-001.png`; tela sem `id` usa `<slug-da-rota>.png` (ex.: `/relatorios` → `screens/relatorios.png`). Artefatos lidos da raiz do repositório (ex.: `tasks.json`) prefixam `outputs/spec/` — mesma imagem, base diferente.
3. O manifesto é JSON puro (sem comentários); este arquivo é a documentação do contrato.
