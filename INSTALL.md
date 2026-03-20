# RepoPlanner: Install & setup

Use this guide to add RepoPlanner to a Next.js app and get the planning cockpit running.

## IDE / typecheck in this submodule only

This folder is a **fully contained submodule**: it has its own `tsconfig.json` and minimal stub files under `lib/` and `components/ui/` so that when you open it in an editor, the IDE resolves `@/` and dependencies without needing the host app. Optional: from this directory run `pnpm install --ignore-workspace` to install devDependencies (react, recharts, etc.). Then the editor and `pnpm exec tsc --noEmit` use the local config. At runtime the host still supplies real UI and deps; the stubs are for typecheck/IDE only.

## Prerequisites

- **Node 18+**
- **Next.js 14+** (App Router)
- **Tailwind CSS** and **shadcn/ui** (or equivalent: Card, Tabs, Button, Input, ScrollArea, Badge, Chart primitives). The UI relies on semantic tokens: `--foreground`, `--muted-foreground`, `--card`, `--border`, `--primary`, etc.

## 1. Add the submodule

From your **repo root** (not inside the Next app directory):

```bash
git submodule add https://github.com/MagicbornStudios/RepoPlanner.git vendor/repo-planner
git submodule update --init --recursive
```

If the repo already has the submodule (e.g. after clone):

```bash
git submodule update --init --recursive
```

### Bootstrap `.planning/` (greenfield)

From the **host repo root** (where `.planning` should live):

```bash
node vendor/repo-planner/scripts/loop-cli.mjs init
```

This copies XML/MD templates into `.planning/templates/`, writes `STATE.xml`, `TASK-REGISTRY.xml`, `ROADMAP.xml`, `DECISIONS.xml`, `ERRORS-AND-ATTEMPTS.xml`, `REQUIREMENTS.xml`, `planning-config.toml`, `reports/.gitkeep`, phase folder `phases/01-greenfield/` with `01-01-PLAN.xml` and `01-01-SUMMARY.xml`, and creates **`AGENTS.md`** at the repo root unless it already exists. Use **`--force`** to overwrite those bootstrap files; **`--no-agents-md`** to skip `AGENTS.md`.

Then run `planning setup checklist` to verify git + planning files.

## 2. Path alias (Next.js app)

So you can `import { PlanningCockpit } from "@/vendor/repo-planner"`, add a path in your Next app’s `tsconfig.json`. If the app lives in e.g. `docs-site/`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/vendor/repo-planner": ["../vendor/repo-planner"],
      "@/*": ["./*"]
    }
  }
}
```

Adjust the path if your app is at repo root (e.g. `["vendor/repo-planner"]`).

## 3. Planning CSS tokens (required for status/diff colors)

RepoPlanner uses **theme tokens** so the host controls colors. In your **global CSS** (e.g. `app/global.css` or `app/(fumadocs)/global.css`), define:

```css
:root {
  /* HSL values only (no "hsl()") – used for status badges and diff colors */
  --planning-status-done: 142 76% 36%;
  --planning-status-progress: 38 92% 50%;
  --planning-status-failed: 0 72% 51%;
  --planning-diff-add: 142 76% 36%;
  --planning-diff-remove: 0 72% 51%;
}

@theme inline {
  /* If you use Tailwind v4 @theme, expose them for Tailwind */
  --color-planning-status-done: hsl(var(--planning-status-done));
  --color-planning-status-progress: hsl(var(--planning-status-progress));
  --color-planning-status-failed: hsl(var(--planning-status-failed));
  --color-planning-diff-add: hsl(var(--planning-diff-add));
  --color-planning-diff-remove: hsl(var(--planning-diff-remove));
}

/* Optional: classes used by planning-status.ts for badges */
.planning-status-done {
  border-color: color-mix(in oklch, var(--color-planning-status-done), transparent 40%);
  background-color: color-mix(in oklch, var(--color-planning-status-done), transparent 85%);
  color: var(--color-planning-status-done);
}
.planning-status-progress {
  border-color: color-mix(in oklch, var(--color-planning-status-progress), transparent 40%);
  background-color: color-mix(in oklch, var(--color-planning-status-progress), transparent 85%);
  color: var(--color-planning-status-progress);
}
.planning-status-failed {
  border-color: color-mix(in oklch, var(--color-planning-status-failed), transparent 40%);
  background-color: color-mix(in oklch, var(--color-planning-status-failed), transparent 85%);
  color: var(--color-planning-status-failed);
}
.planning-diff-add {
  background-color: color-mix(in oklch, var(--color-planning-diff-add), transparent 85%);
  color: color-mix(in oklch, var(--color-planning-diff-add), white 20%);
}
.planning-diff-remove {
  background-color: color-mix(in oklch, var(--color-planning-diff-remove), transparent 85%);
  color: color-mix(in oklch, var(--color-planning-diff-remove), white 20%);
}
```

If you don’t add the `.planning-status-*` / `.planning-diff-*` classes, status badges still get colors from your Badge component; the tokens are used when those classes are applied.

## 4. Planning CLI script (optional but recommended)

From **repo root**, you want to run the submodule CLI so it reads your repo’s `.planning/`:

```json
{
  "scripts": {
    "planning": "node vendor/repo-planner/scripts/loop-cli.mjs"
  }
}
```

Then: `pnpm planning snapshot`, `pnpm planning new-agent-id`, etc.

## 5. Add a planning page

Create a page that renders the cockpit (e.g. `app/planning/page.tsx` or under your app layout):

```tsx
"use client";

import { PlanningCockpit } from "@/vendor/repo-planner";

export default function PlanningPage() {
  return (
    <div className="flex flex-col gap-4">
      <PlanningCockpit />
    </div>
  );
}
```

## 6. Install API routes from the package (recommended)

The package owns planning API handlers. Install thin re-export routes into your Next.js app so you don’t maintain route code:

```bash
# From repo root; app dir default is docs-site
node vendor/repo-planner/scripts/install-routes.mjs [--app-dir=docs-site] [--dry-run]
```

This writes (or overwrites) files under `app-dir/app/api/` that re-export GET/POST from the package. Re-run after updating the submodule. See `--help` for options.

## 7. API routes (cockpit needs them)

The cockpit fetches state, reports, metrics, and can run the CLI. Your app must expose API routes that the UI calls. Either install them from the package (above) or implement your own. Typical routes:

| Route | Purpose |
|-------|--------|
| `GET /api/planning-state` | Agent-loop bundle (state, tasks, questions). Run CLI `simulate loop --json` from **repo root**. |
| `GET /api/planning-reports/latest` | Latest report markdown. |
| `GET /api/planning-metrics` | Metrics + usage (if you use `planning report generate`). |
| `POST /api/planning-cli/run` | Run arbitrary CLI commands (e.g. `snapshot`, `report generate`). |
| `POST /api/ai/planning-chat` | AI planning chat (if you use it). |

For **test reports**: run `pnpm test:unit` from the Next app dir (e.g. `docs-site`) so that `test-reports/unit/results.json` is written (vitest config with `reporters: ['json']`, `outputFile.json`). The Tests tab in the cockpit fetches `GET /api/test-reports/unit` to display pass/fail and per-suite details.

In each planning route, run the CLI from **repo root** with:

- **CLI path**: `path.join(process.cwd(), "vendor", "repo-planner", "scripts", "loop-cli.mjs")` (if the Next app runs from repo root), or `path.join(process.cwd(), "..", "vendor", "repo-planner", "scripts", "loop-cli.mjs")` if the app lives in a subdir (e.g. `docs-site/`).
- **cwd**: your repo root (where `.planning/` lives).

See your host repo’s existing `app/api/planning-*` and `app/api/ai/planning-chat` for examples.

## 7. `.planning/` in the host

RepoPlanner does **not** ship your STATE, ROADMAP, or TASK-REGISTRY. Keep `.planning/` in the host repo (STATE.xml, ROADMAP.xml, TASK-REGISTRY.xml, phases, templates, etc.). The submodule’s `.planning/templates/` are a reference; you can copy or symlink, or keep your own. The CLI and UI always use the host’s `.planning/` when run from the host.

## 9. Dependencies

The UI uses:

- `react`, `react-dom`
- `lucide-react`
- `recharts`
- `react-markdown`
- `@assistant-ui/react`, `@assistant-ui/react-ui` (for chat tab)
- `motion` (framer-motion)
- shadcn primitives: Card, Tabs, Button, Input, ScrollArea, Badge, Chart components

Install these in the **host** app; the submodule has no `package.json` and relies on the host’s `node_modules`.

## Styling gotchas

- **No Tailwind**: The UI uses Tailwind class names (`flex`, `gap-4`, `text-foreground`, etc.). The **variable values** have fallbacks from planning.css, but the **classes** must exist (Tailwind or equivalent). Use a Tailwind + shadcn (or compatible) build for best results.
- **Dark mode**: Fallbacks in planning.css are dark-theme friendly. If you use `.dark` or data-theme, you can override variables under `.dark .repo-planner` (or similar) to match.

## Versioning

Pin the submodule commit in the host so upgrades are intentional:

```bash
cd vendor/repo-planner && git fetch && git checkout v1.0.0 && cd ../..
git add vendor/repo-planner && git commit -m "chore: pin RepoPlanner to v1.0.0"
```
