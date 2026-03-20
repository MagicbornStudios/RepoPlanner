# Agent loop guide

XML-first planning. Use `.planning/templates/` for PLAN, SUMMARY, ROADMAP, TASK-REGISTRY, DECISIONS. Keep product intent in `REQUIREMENTS.xml` (and cite it from phase plans).

**Quick start**

1. From the **repository root** (where `.planning/` lives), run **`planning snapshot`** (or `node vendor/repo-planner/scripts/loop-cli.mjs snapshot` if you have no package script).
2. Register a unique agent id in **STATE.xml** (`agent-YYYYMMDD-xxxx`). Generate one with **`planning new-agent-id`** (same CLI).
3. Claim or create work in **TASK-REGISTRY.xml**; read **REQUIREMENTS.xml** and the current phase **PLAN** under `.planning/phases/`.
4. Update **ROADMAP**, phase PLAN/SUMMARY, **DECISIONS**, and **STATE** as you go. Capture gaps in `requriements-suggestions` in phase docs; record failed attempts in **ERRORS-AND-ATTEMPTS.xml**.

**CLI location:** With RepoPlanner as a submodule, the script is usually `vendor/repo-planner/scripts/loop-cli.mjs`. In a standalone RepoPlanner clone, it is `scripts/loop-cli.mjs`. Add a `package.json` script (e.g. `"planning": "node vendor/repo-planner/scripts/loop-cli.mjs"`) so agents can run `pnpm planning <command>`.

**Coding conventions:** Extend this file with your team’s style, tests, and review rules so the planning bundle always includes them (`planning-config.toml` → `conventionsPaths`).
