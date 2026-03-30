# RepoPlanner

Embeddable planning cockpit, parsing helpers, and CLI tooling for roadmap/state/task-registry workflows.

[INSTALL.md](./INSTALL.md) documents host integration details.

## What it does

- reads planning roots from `planning-config.toml`
- works with a minimal XML planning tree by default
- exposes a `repo-planner` CLI entrypoint
- ships host-mountable React surfaces for Pack and Live planning views
- supports read-only preview uploads for pack JSON and `.planning` zip inspection
- keeps workflow support aligned with roadmap, state, task registry, decisions, and kickoff records

## Core surfaces

| Surface | Purpose |
| --- | --- |
| `repo-planner` CLI | snapshot, checklist, init, reports, pack helpers |
| `repo-planner/host` | host shell and cockpit dashboard |
| `repo-planner/planning-pack` | planning-pack gallery and helpers |
| `repo-planner/planning.css` | scoped package styling tokens |
| `repo-planner/cockpit-host-context` | neutral reading-surface / host-context payload helpers |

## Quick start

### Host repo

```bash
git submodule add https://github.com/MagicbornStudios/RepoPlanner.git vendor/repo-planner
git submodule update --init --recursive

# then from the host repo root
node vendor/repo-planner/scripts/loop-cli.mjs init --minimal --no-agents-md
node vendor/repo-planner/scripts/loop-cli.mjs snapshot
```

If the package is installed as a dependency, the same CLI is available through the bin:

```bash
pnpm exec repo-planner snapshot
```

## Publish contract

- Package name stays `repo-planner`.
- The package is source-first: hosts import the package subpaths and transpile them in-app instead of depending on a precompiled JS bundle.
- `peerDependencies` stay host-owned so apps control their React, Next, and UI runtime versions.
- `.planning/` bootstrap assets stay in the tarball because the CLI init flow depends on them.
- Release cadence uses semver:
  - patch: docs fixes, packaging fixes, non-breaking bug fixes
  - minor: new exports, new host surfaces, additive CLI commands
  - major: breaking CLI argv changes, export-path changes, or host-contract changes

Before publishing, verify the tarball from the package root:

```bash
pnpm pack --dry-run
```

### Minimal planning tree

Default minimal init creates:

- `.planning/AGENTS.md`
- `planning-config.toml`
- `STATE.xml`
- `TASK-REGISTRY.xml`
- `ROADMAP.xml`
- `DECISIONS.xml`
- `ERRORS-AND-ATTEMPTS.xml`
- `REQUIREMENTS.xml`

It does not create `.planning/IMPLEMENTATION_PLAN.md` or `.planning/reports/`.

### Host app

Use the package exports instead of direct app-local aliases:

```tsx
import { PlanningCockpitDashboard } from "repo-planner/host";
import "repo-planner/planning.css";
```

Add `repo-planner` to `transpilePackages` in Next.js, include the vendored package in Tailwind content scanning when needed, and point your host APIs at the planning root you want to read. See [INSTALL.md](./INSTALL.md) for the full consumer contract.

### Route install defaults

RepoPlanner's `install-routes.mjs` now generates package-import based route files and defaults to read-only GET routes. Opt into command/write POST routes explicitly when the host actually wants them.

## Planning stance

RepoPlanner is a workflow accelerator, not a second planning system. The living records are still:

- roadmap
- state
- task registry
- decisions
- optional phase kickoff / plan records

The cockpit and CLI should summarize those files, not replace them with hidden state.

## License

See [LICENSE](./LICENSE).
