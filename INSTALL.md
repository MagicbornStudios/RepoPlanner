# RepoPlanner: Install and setup

Use this guide to add RepoPlanner to a Next.js app and get the planning cockpit running against a host repository.

## Prerequisites

- Node 22+
- Next.js 14+ or newer
- Tailwind CSS or equivalent utility pipeline
- A host repository with a planning root (`.planning/` by default)

## 1. Add RepoPlanner to the host

RepoPlanner can be consumed from a vendored checkout or as a published package. The publish surface is the same source-first package contract used in this repo.

### Vendored / local package

```bash
git submodule add https://github.com/MagicbornStudios/RepoPlanner.git vendor/repo-planner
git submodule update --init --recursive
pnpm add repo-planner@file:../../vendor/repo-planner
```

Adjust the relative `file:` path for your app package.

### CLI-only use from the host root

You can also call the vendored CLI directly:

```bash
node vendor/repo-planner/scripts/loop-cli.mjs --help
```

The package now exposes the same entrypoint through the `repo-planner` bin, so hosts that install it as a dependency can run:

```bash
pnpm exec repo-planner --help
```

### Publish / tarball verification

From the package root:

```bash
pnpm pack --dry-run
```

That dry-run should include the runtime source files, package subpath entrypoints, CLI scripts, and `.planning/` bootstrap assets. It should not rely on `vendor/`-only import paths from the consuming app.

## 2. Bootstrap the host planning tree

From the host repo root:

```bash
node vendor/repo-planner/scripts/loop-cli.mjs init --minimal --no-agents-md
```

Minimal init creates:

- `.planning/AGENTS.md`
- `STATE.xml`
- `TASK-REGISTRY.xml`
- `ROADMAP.xml`
- `DECISIONS.xml`
- `ERRORS-AND-ATTEMPTS.xml`
- `REQUIREMENTS.xml`
- `planning-config.toml`

Minimal init does **not** create:

- `.planning/IMPLEMENTATION_PLAN.md`
- `.planning/reports/`
- `.planning/templates/`
- `.planning/phases/`

Use full init only when you actually need the template and phase scaffolding.

## 3. Configure Next.js

Add the package to `transpilePackages` in your host's `next.config.*`:

```ts
const nextConfig = {
  transpilePackages: ["repo-planner"],
};

export default nextConfig;
```

If your app keeps a repo-root planning tree outside the app directory, also set `REPOPLANNER_PROJECT_ROOT` in the host runtime env or Next config so API routes and child CLI calls resolve the intended repo.

## 4. Tailwind / content scanning

Make sure your host's Tailwind content paths include RepoPlanner source when the package is vendored or linked outside the app root.

Typical monorepo example:

```ts
content: [
  "./app/**/*.{ts,tsx,mdx}",
  "./components/**/*.{ts,tsx}",
  "../../vendor/repo-planner/**/*.{ts,tsx,js,mjs}",
]
```

If you consume a published package instead of vendored source, use the installed package path that matches your toolchain.

## 5. Package imports and subpaths

Import RepoPlanner by package name, not by app-local aliases.

Primary subpaths:

| Import | Purpose |
| --- | --- |
| `repo-planner` | core cockpit surface, planning edit review, data-source types |
| `repo-planner/host` | workspace shell, dashboard, host policy helpers |
| `repo-planner/planning-pack` | planning-pack gallery and embed-pack helpers |
| `repo-planner/planning.css` | package stylesheet |
| `repo-planner/cockpit-host-context` | neutral host context payload helpers |

The package already exposes its own `cn` helper and package-local UI primitives. Hosts do **not** need an `@/lib/utils` alias for RepoPlanner internals, and they should not import from `vendor/repo-planner/*` from app code once the package dependency is installed.

## 6. Global CSS

Import RepoPlanner's package stylesheet once in your host app:

```ts
import "repo-planner/planning.css";
```

You can override the planning status tokens in your own theme:

```css
:root {
  --planning-status-done: 142 76% 36%;
  --planning-status-progress: 38 92% 50%;
  --planning-status-failed: 0 72% 51%;
  --planning-diff-add: 142 76% 36%;
  --planning-diff-remove: 0 72% 51%;
}
```

## 7. Host utility expectations

RepoPlanner ships package-local primitives and utility helpers, but it still assumes the host provides a standard React + Tailwind app shell:

- React and React DOM
- Next.js app/runtime when using the package inside Next
- Tailwind utility classes or an equivalent compiled class pipeline
- your own app-level `cn` helper only for your host code, not for RepoPlanner internals

No `@/vendor/repo-planner` alias should be required in host code.

## 8. Mount the cockpit

Use the exported host shell instead of app-local aliases:

```tsx
"use client";

import { PlanningCockpitDashboard } from "repo-planner/host";

export default function PlanningPage() {
  return <PlanningCockpitDashboard />;
}
```

## 9. Provide host APIs

The cockpit expects host routes for state, metrics, and latest report data. In this portfolio repo those live under `app/api/planning-*`.

At minimum, hosts should provide:

| Route | Purpose |
| --- | --- |
| `GET /api/planning-state` | normalized planning bundle |
| `GET /api/planning-metrics` | metrics payload |
| `GET /api/planning-reports/latest` | latest report markdown or summary |

Optional write routes should stay explicit and gated by host policy.

### Route installer

RepoPlanner ships an installer for host routes:

```bash
node vendor/repo-planner/scripts/install-routes.mjs --app-dir=apps/portfolio --dry-run
```

The installer now:

- targets package imports such as `repo-planner/api/planning-state/route`
- understands monorepo app roots like `apps/portfolio`
- installs GET routes by default
- requires explicit opt-in for command or write routes

```bash
node vendor/repo-planner/scripts/install-routes.mjs \
  --app-dir=apps/portfolio \
  --include-cli-run \
  --include-edits-apply
```

That keeps embeds read-only by default and makes host mutability a deliberate choice.

## 10. Preview uploads

RepoPlanner's Pack mode now supports two upload paths:

- `Import`: local editable planning files persisted in browser storage
- `Preview upload`: read-only ephemeral pack JSON or `.planning` zip inspection with no write path and no local persistence

Preview uploads are intended for quick inspection, not editing. Built-in packs and preview uploads should both stay read-only in the UI.

## 11. Host planning data

RepoPlanner does not ship your live planning files. Keep them in the host repository and point the CLI / APIs at that root with `REPOPLANNER_PROJECT_ROOT` if needed.

Minimal host expectations:

- `.planning/*.xml` for the machine loop
- documentation or section planning files in the host's preferred human format
- `planning-config.toml` as the source of truth for planning roots

## 12. Versioning

Pin the submodule or package version intentionally and upgrade on purpose.

RepoPlanner uses a simple semver policy:

- patch: packaging fixes, docs fixes, non-breaking bug fixes
- minor: additive exports, additive CLI commands, new cockpit surfaces
- major: breaking command syntax, export-path changes, or host-contract changes

```bash
cd vendor/repo-planner
git fetch
git checkout <ref>
cd ../..
git add vendor/repo-planner
git commit -m "chore: update RepoPlanner"
```
