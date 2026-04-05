# Agent guide — repo-planner

This project is managed under the **GAD framework**. Use `gad` CLI for context, state, and task queries.

## Context re-hydration (after auto-compact)

```sh
gad session list
gad context --session <id> --json
```

Load the returned refs, then continue. Never stop for context limits.

## Planning

| File | Role |
|------|------|
| `.planning/ROADMAP.md` | Phase checklist |
| `.planning/STATE.md` | Current position and next action |
| Docs sink | `apps/portfolio/content/docs/repo-planner/planning/` |

## Docs sink

The portfolio docs at `apps/portfolio/content/docs/repo-planner/planning/` are the **canonical human-readable planning record** for this project. Keep them in sync when phase status or state changes.

## Skills

`rp-*` skills in `vendor/repo-planner/skills/` are **deprecated**. Use `gad:*` equivalents in `vendor/get-anything-done/skills/`.

## Loop

1. Read STATE.md → pick one task from current phase
2. Implement → verify (run lint/typecheck/tests as appropriate)
3. Mark task done → update STATE.md → commit
4. Update docs sink if phase status changed
