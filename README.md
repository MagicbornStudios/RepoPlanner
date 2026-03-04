# RepoPlanner

Planning loop CLI and contract for repo orchestration (STATE, TASK-REGISTRY, ROADMAP, phases). Use as a **git submodule** under `vendor/repo-planner` in a host repo.

## Contents

- **`scripts/loop-cli.mjs`** — Planning CLI (`snapshot`, `new-agent-id`, report generation, etc.). Run from **host repo root** so it reads the host’s `.planning/` (e.g. `node vendor/repo-planner/scripts/loop-cli.mjs snapshot`).
- **`.planning/templates/`** — XML/MD templates for PLAN, SUMMARY, ROADMAP, TASK-REGISTRY, DECISIONS, etc. Host may keep its own `.planning/` and use these as reference, or copy into host `.planning/templates/`.

## Host integration (Next.js)

1. **CLI**: From host root, run the submodule CLI:
   ```bash
   node vendor/repo-planner/scripts/loop-cli.mjs snapshot
   ```
   Or in `package.json`: `"planning": "node vendor/repo-planner/scripts/loop-cli.mjs"`. The CLI uses `process.cwd()` as the planning root, so the host’s `.planning/` (STATE, ROADMAP, TASK-REGISTRY, etc.) remains the source of truth.

2. **UI (planning cockpit)**: The host app renders the planning UI (e.g. a single `PlanningCockpit` component). Styling is **host-controlled** via CSS variables so the UI fits the host theme:
   - `--planning-status-done`, `--planning-status-progress`, `--planning-status-failed` (HSL values, e.g. `142 76% 36%`)
   - `--planning-diff-add`, `--planning-diff-remove`
   Define these in the host’s global CSS (e.g. `:root { ... }`). The planning components use only these tokens and semantic class names.

3. **Codex / agent loop**: Unchanged. Agents run the CLI from host root, register in STATE, claim tasks in TASK-REGISTRY, and read REFERENCES/REQUIREMENTS. The submodule does not replace the host’s `.planning/` data.

## Adding this repo as a submodule

From the host repo root:

```bash
git submodule add https://github.com/MagicbornStudios/RepoPlanner.git vendor/repo-planner
git submodule update --init --recursive
```

## Versioning

Tag or pin the submodule commit in the host repo so upgrades are intentional.
