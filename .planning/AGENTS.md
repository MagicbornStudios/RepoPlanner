# Agent guide — repo-planner

This project is managed under the **GAD framework**. Use `gad` CLI for all planning context.

## Context re-hydration

```sh
gad state --projectid repo-planner
gad tasks --projectid repo-planner
gad decisions --projectid repo-planner
```

Or full snapshot:
```sh
gad snapshot --projectid repo-planner
```

## Planning loop

1. `gad state --projectid repo-planner` — read current phase and next action
2. Pick one planned task from `gad tasks --projectid repo-planner`
3. Implement it
4. Update `.planning/TASK-REGISTRY.xml` — mark task done
5. Update `.planning/STATE.xml` — update next-action
6. `gad sink sync` — propagate to docs sink
7. Commit

## Planning files

| File | Purpose |
|------|---------|
| `.planning/STATE.xml` | Current phase, milestone, status, next-action |
| `.planning/ROADMAP.xml` | Phase breakdown (MD fallback: ROADMAP.md) |
| `.planning/TASK-REGISTRY.xml` | All tasks by phase with status |
| `.planning/DECISIONS.xml` | Architectural decisions |

## Docs sink

Planning docs compile to: `apps/portfolio/content/docs/repo-planner/planning/`

```sh
gad sink sync                               # compile all projects
gad sink status --projectid repo-planner    # check sync state
```

## Skills

`rp-*` skills in `vendor/repo-planner/skills/` are **deprecated**. Use `gad:*` equivalents in `vendor/get-anything-done/skills/`.

## Current work

Phase 07 (gad-migration-01) — active. Run `gad tasks --projectid repo-planner` for open tasks.
