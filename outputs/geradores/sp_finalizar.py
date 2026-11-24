import sys
from pathlib import Path
S, REPO = Path(sys.argv[1]), Path(sys.argv[2])
fm = REPO/'outputs/spec/flow-map.md'
s = fm.read_text(encoding='utf-8')
met = (S/'fm_out.txt').read_text(encoding='utf-8').strip()
just = """**Avisos tratados (3):** os estados abaixo nascem em etapas automáticas, sem tela própria, e
aparecem em telas de outras etapas do mesmo fluxo:

- `Lote.ok` (TRS-001): o resultado do lote aparece na TEL-001 Integrações & Sincronização (ETP-003).
- `Caso.novo` (TRS-017): o caso novo aparece na TEL-009 Minha Fila assim que é atribuído (ETP-018).
- `Regularizacao.registrada` (TRS-021): a regularização aparece na TEL-011 Regularizações & Origem (ETP-023).

**Etapas sem tela (8 de 25):** todas são processamento automático (carga, consolidação, score,
motor de réguas, encaminhamento, criação de casos, encerramento e atribuição de origem).
**Transições sem regra (4 de 27):** são encerramentos de consulta, sem condição de negócio."""
s = s.replace('[MÉTRICAS]', met).replace('[JUSTIFICATIVAS]', just)
fm.write_text(s, encoding='utf-8')
print('flow-map finalizado')
