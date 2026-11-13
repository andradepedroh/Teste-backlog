# business-map.md — Esquema canônico do `business-map.json`

Fonte de verdade estruturada do AS-IS (spec-legacy), gravada em `outputs/spec/business-map.json` (JSON puro — este arquivo documenta o esquema, campo a campo). Preenchida progressivamente (Passo B → 1 → dimensões → 3.5 → 5) e **validada** no Passo 9 (`check-legacy-business.py`). Um único objeto raiz:

```json
{
  "metadata": {
    "project_name": "<nome do produto/sistema — não o primeiro framework>",
    "generated_at": "<ISO>",
    "mode": "Digital|Processo-Manual|Híbrido",
    "graph_source": "graphify-out/graph.json | none",
    "confidence": "high|medium|low"
  },
  "code_modules": [
    { "id": "MOD-001", "name": "<rótulo técnico>", "root_paths": ["<path rel. a inputs/>"],
      "layer_hints": ["web","service"], "database_hints": ["<prefixo/schema>"],
      "out_of_business_scope": false, "category": "product|infrastructure|shared_kernel|test", "scope_note": "" }
  ],
  "business_modules": [
    { "id": "BM-001", "name": "<capacidade em linguagem de negócio>", "capability_summary": "<1-3 frases, sem stack>",
      "primary_entities": [ { "name": "", "business_description": "", "evidence": ["<file/tabela>"] } ],
      "business_rule_clusters": [ { "id": "BRC-BM01-01", "summary": "", "trigger_or_condition": "", "affected_entities": [], "evidence": [] } ],
      "maps_to_code_module_ids": ["MOD-001"],
      "overlaps_with": [ { "bm_id": "BM-002", "relationship": "shares_entity|shared_rule|dependency|upstream|downstream", "via": "" } ],
      "confidence": "high|medium|low", "scope_boundary": "" }
  ],
  "cross_cutting_views": {
    "entity_rule_crosswalk": [ { "entity": "", "business_module_ids": ["BM-001"], "rule_cluster_ids": ["BRC-BM01-01"], "notes": "<citar grafo: query/path/grau>" } ],
    "domain_hypothesis_notes": "<2-5 frases sobre fronteiras/acoplamento — citar comunidades/grau do grafo>"
  },
  "graph_findings": {
    "graph_source": "graphify-out/graph.json",
    "named_by_llm": false,
    "god_classes": [ { "node": "", "file": "", "degree": 0, "why": "<por que é hub crítico de negócio>" } ],
    "migration_seams": [ { "node": "", "file": "", "seam_rationale": "<ponto de corte/betweenness — costura Strangler Fig>" } ],
    "dependency_cycles": [ { "members": ["<file/node>", "<file/node>"], "impact": "<risco de migração>" } ],
    "orphan_files": [ { "file": "", "evidence": "grau 0 / sem caminho para entrada — candidato a Retire" } ],
    "capability_chains": [ { "capability": "BM-001", "path": ["<action>", "<service>", "<tabela>"], "source": "graphify path" } ],
    "communities": [ { "community_id": "C1", "hub_nodes": [""], "suggested_name": "<nome por hub>", "mapped_bm_id": "BM-001" } ]
  },
  "graph_coverage": {
    "total_files": 0, "files_with_domain": 0,
    "files_without_domain": [ "<source_file sem MOD/DOM — ponto cego declarado>" ]
  },
  "domains": [
    { "id": "DOM-001", "name": "", "source_business_module_ids": ["BM-001"], "source_module_ids": ["MOD-001"],
      "description": "", "business_capability": "", "size": "small|medium|large", "complexity": "low|medium|high|critical",
      "relationships": [ { "target_domain": "DOM-002", "coupling_level": "tight|moderate|loose", "description": "" } ],
      "kpis_domain": [ { "id": "KPI-001", "name": "", "description": "", "stakeholder": "" } ],
      "pain_points": [ { "title": "", "description": "", "business_impact": "cost|risk|operations", "estimated_cost": "", "evidence": "" } ],
      "business_impact_narrative": "<difere por domínio>",
      "user_stories": [ { "id": "US-DOM001-01", "persona": "", "story": "", "business_outcome": "", "linked_process_ids": ["PROC-001"] } ] }
  ],
  "business_rules": [
    { "id": "RN-DOM001-001", "name": "", "category": "validation|calculation|compliance", "description": "",
      "business_rationale": "", "business_impact_if_violated": "", "example_scenario": "",
      "implementation": { "location": "<file/proc/config>", "type": "application_code|stored_procedure|configuration|other" },
      "affected_domains": ["DOM-001"], "confidence": "high|medium|low" }
  ],
  "processes": [
    { "id": "PROC-001", "name": "", "primary_domain_ids": ["DOM-001"], "description": "", "business_importance": "critical|high|medium",
      "steps": [ { "order": 1, "name": "", "actor": "", "action": "", "outcome": "", "exception_paths": [] } ],
      "failure_scenarios": [ { "scenario": "", "business_impact": "", "current_recovery": "" } ],
      "pain_points": [ { "pain": "", "business_cost": "", "evidence": "" } ] }
  ],
  "opportunities": [
    { "id": "OPP-001", "title": "", "category": "process_improvement|automation|ai_agent|new_feature|integration",
      "description": "", "business_problem_solved": "", "business_value": "", "affected_domains": ["DOM-001"], "success_metrics": [],
      "ai_agent_spec": { "input": "", "output": "", "financial_value": "" } }
  ],
  "value_chain": { "cycles": [ { "name": "", "description": "", "stakeholders": [], "kpis": ["KPI-001"] } ] },
  "database_analysis": { "total_tables": 0, "complexity_smells": [], "business_logic_in_db": [], "vendor_lock_in": [],
    "complexity": { "score": 0, "justification": "" } },
  "complexity": { "score": 0, "classification": "Baixa|Média|Alta|Crítica",
    "technology_subtotal": 0, "business_subtotal": 0,
    "top_complexity_drivers": [ { "driver": "", "business_consequence": "" } ],
    "risk_summary": { "migration_blockers": [], "migration_enablers": [] } }
}
```

`ai_agent_spec` só em oportunidades `ai_agent`. IDs únicos e sequenciais por prefixo. Em Modo Processo-Manual sem código, `code_modules` pode ficar vazio e `graph_source: "none"` — os demais blocos de negócio continuam obrigatórios.

`graph_findings` e `graph_coverage` são **obrigatórios no Modo Digital/Híbrido** (preenchidos no Passo 0.6 — Mineração do grafo) e omitidos/`N/A` em Processo-Manual/skip. Cada lista de `graph_findings` pode vir vazia (`[]`) apenas quando a investigação foi feita e **nada** foi encontrado — nunca por não ter sido investigada. Quando `named_by_llm: false` (grafo sem etapa semântica), `communities[].mapped_bm_id` é obrigatório (nomeação por hub → BM). O `check-legacy-business.py --graph` valida estes blocos e a cobertura de arquivos.
