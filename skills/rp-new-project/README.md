# rp-new-project skill

Initialize a new project with the RepoPlanner planning structure. Sets up the full `.planning/` directory with requirements, roadmap, state, and task registry.

## Install

```bash
npx skills add MagicbornStudios/repo-planner-skills/skills/rp-new-project
```

## What it does

When the user starts a new project or wants to set up planning docs, Claude will:
1. Ask questions about what you're building (goal, audience, constraints, non-goals)
2. Create `PROJECT.md` with project context
3. Define requirements with stable REQ-IDs (`AUTH-01`, `CONTENT-02`, etc.)
4. Generate a phased `ROADMAP.md` with every v1 requirement mapped to a phase
5. Initialize `STATE.md` and `TASK-REGISTRY.md`
6. Commit all planning artifacts

Works for simple repos and monorepo sections.

## Install alongside

```bash
npx skills add MagicbornStudios/repo-planner-skills/skills/repo-planner
npx skills add MagicbornStudios/repo-planner-skills/skills/rp-plan-phase
```

## About RepoPlanner

[RepoPlanner](https://github.com/MagicbornStudios/RepoPlanner) — open-source planning system from MagicbornStudios.
