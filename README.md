# RepoPlanner

Planning loop CLI and contract for repo orchestration (STATE, TASK-REGISTRY, ROADMAP, phases). Use as a **git submodule** under `vendor/repo-planner` in a host repo. **→ [INSTALL.md](./INSTALL.md)** | **→ [STYLING.md](./STYLING.md)** (atomic design, install-routes, standalone).

## Contents

- **`scripts/loop-cli.mjs`** — Planning CLI (`snapshot`, `new-agent-id`, report generation, etc.). Run from **host repo root** so it reads the host’s `.planning/` (e.g. `node vendor/repo-planner/scripts/loop-cli.mjs snapshot`).
- **`desktop/`** — Neutralino desktop app (planning cockpit in a window). Download the latest **desktop executable** from [Releases](https://github.com/MagicbornStudios/RepoPlanner/releases). Run the planning server (e.g. `pnpm planning:standalone` in a host repo) then run the desktop app; it loads the cockpit at `http://localhost:3101`.
- **`.planning/templates/`** — XML/MD templates for PLAN, SUMMARY, ROADMAP, TASK-REGISTRY, DECISIONS, etc. Host may keep its own `.planning/` and use these as reference, or copy into host `.planning/templates/`.

## Host integration (Next.js)

1. **CLI**: From host root, run the submodule CLI:
   ```bash
   node vendor/repo-planner/scripts/loop-cli.mjs snapshot
   ```
   Or in `package.json`: `"planning": "node vendor/repo-planner/scripts/loop-cli.mjs"`. The CLI uses `process.cwd()` as the planning root, so the host’s `.planning/` (STATE, ROADMAP, TASK-REGISTRY, etc.) remains the source of truth.

2. **UI (planning cockpit)**: The host app renders the planning UI (e.g. a single `PlanningCockpit` component). **Styling is hardened**: the submodule ships `planning.css` (imported automatically when you import from the barrel). It scopes under `.repo-planner` and provides **fallbacks** for all semantic tokens and the five planning tokens. The cockpit works with or without host theme; override any variable in your CSS to match your app. Optional details:
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

## Styling: hardened by default

- **Self-contained**: Importing from `@/vendor/repo-planner` pulls in `planning.css`, which scopes variables and status/diff classes under `.repo-planner`. You don’t need to define any CSS for planning to look correct.
- **Override when you want**: If your app already has `--foreground`, `--card`, etc., those values are used inside the cockpit. To theme planning, set the five planning tokens or override any variable in a rule that targets `.repo-planner` (or a parent).
- **Tailwind/shadcn**: The UI still uses Tailwind-style class names (e.g. `text-foreground`, `bg-card`). The host should have Tailwind (and ideally shadcn) so those classes exist. The **values** of the variables they use now have fallbacks from `planning.css`; only the **class names** depend on the host build.

## Versioning

Tag or pin the submodule commit in the host repo so upgrades are intentional.
