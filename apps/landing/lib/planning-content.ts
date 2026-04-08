/** Static reference content for the landing page — copy/paste friendly. */

export const CHART_CLI_FLOW = `flowchart TB
  subgraph host["Host repository"]
    CFG["planning-config.toml"]
    PLAN[".planning/"]
  end
  CLI["repo-planner / loop-cli.mjs"]
  CLI -->|snapshot, checklist, init, reports, pack| PLAN
  CFG -->|roots| CLI
  COCK["repo-planner/host"] -->|reads| PLAN`;

export const CHART_ARTIFACT_GRAPH = `flowchart LR
  subgraph xml["Planning records"]
    R["ROADMAP.xml"]
    TR["TASK-REGISTRY.xml"]
    ST["STATE.xml"]
    DC["DECISIONS.xml"]
    ER["ERRORS-AND-ATTEMPTS.xml"]
    RQ["REQUIREMENTS.xml"]
  end
  R --> ST
  TR --> ST
  DC --> ST
  AG["AGENTS.md"] --> ST`;

export const MINIMAL_TREE_SNIPPET = `.planning/
├── AGENTS.md
├── STATE.xml
├── TASK-REGISTRY.xml
├── ROADMAP.xml
├── DECISIONS.xml
├── ERRORS-AND-ATTEMPTS.xml
└── REQUIREMENTS.xml

planning-config.toml   # planning roots for the monorepo`;

export const STATE_XML_STUB = `<?xml version="1.0" encoding="UTF-8"?>
<state>
  <current-phase>01</current-phase>
  <status>active</status>
  <next-action>Pick one planned task from TASK-REGISTRY.xml</next-action>
</state>`;

export const TASK_REGISTRY_STUB = `<?xml version="1.0" encoding="UTF-8"?>
<task-registry>
  <phase id="01">
    <task id="01-01" status="planned">
      <goal>Concrete outcome in one sentence</goal>
    </task>
  </phase>
</task-registry>`;

export const DECISIONS_STUB = `<?xml version="1.0" encoding="UTF-8"?>
<decisions>
  <decision id="01-01">
    <title>Short title</title>
    <summary>Why we chose this approach.</summary>
  </decision>
</decisions>`;
