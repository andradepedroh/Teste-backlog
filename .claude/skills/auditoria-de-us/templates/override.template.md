# Override de Falso-Positivo — [US-XXX]

<!-- Copie para outputs/spec/auditorias/US-XXX.override.md e commite.
     Só neutraliza achados BLOQUEANTES marcados como falso-positivo. NÃO dispensa a auditoria:
     o relatório US-XXX.md precisa existir e ter rodado. O gate só libera se os ids abaixo
     cobrirem TODOS os achados-bloqueantes do relatório e o commit-auditado casar.
     O gate casa este override por `us` + `commit-auditado` (o SHA já ancora o repositório certo,
     porque o relatório traz um commit por repo). O campo `repositorio` abaixo é CONTEXTO humano
     — diz a qual repo da US este override se refere — não é a chave de casamento. -->

<!-- gate:override -->
us: US-XXX
repositorio: <contexto: a qual repo da US este override se refere — o mesmo do commit abaixo>
autor: <seu nome>
data: <AAAA-MM-DD>
commit-auditado: <sha-curto — deve casar com o commit desse repo no relatório>
achados-falso-positivo:
  - id: SEC-001
    justificativa: <por que este achado é falso-positivo — concreto e verificável>
  - id: BUG-003
    justificativa: <...>
<!-- /gate:override -->