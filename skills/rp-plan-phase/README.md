# rp-plan-phase skill

Plan a phase using the RepoPlanner methodology. Creates a KICKOFF.md (lightweight phase contract) and PLAN.md (concrete task list) before implementation starts.

## Install

```bash
npx skills add MagicbornStudios/repo-planner-skills/skills/rp-plan-phase
```

## What it does

Before starting any phase, Claude will:
1. Run a kickoff: establish goal, scope, non-goals, and definition-of-done
2. Break the phase into atomic, verifiable tasks with stable IDs
3. Create `KICKOFF.md` and `PLAN.md` in `.planning/phases/<phase-id>/`
4. Update `TASK-REGISTRY.md` and `STATE.md`
5. Commit the artifacts

**When kickoffs are required:** phase goal is vague, phase has been idle, or scope is large (> ~1 day of work).

## Install alongside

```bash
npx skills add MagicbornStudios/repo-planner-skills/skills/repo-planner
npx skills add MagicbornStudios/repo-planner-skills/skills/rp-new-project
```

## About RepoPlanner

[RepoPlanner](https://github.com/MagicbornStudios/RepoPlanner) — open-source planning system from MagicbornStudios.
