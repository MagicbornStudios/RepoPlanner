# repo-planner skill

The core RepoPlanner methodology skill for Claude Code. Teaches Claude how to work with the [RepoPlanner](https://github.com/MagicbornStudios/RepoPlanner) planning system — reading docs in the right order, understanding the ID system, maintaining state, and knowing when to require kickoffs.

## Install

```bash
npx skills add MagicbornStudios/repo-planner-skills/skills/repo-planner
```

## What it does

After installing, Claude will:
- Read planning docs in the correct order before starting work (requirements → roadmap → state → task-registry → decisions)
- Understand the 5-doc planning loop and each file's role
- Use the `<namespace>-<stream>-<phase>[-<task>]` ID system
- Recognize when a phase needs a kickoff before implementation starts
- Know how to update planning docs after execution
- Layer planning across monorepos (global/section/sub-project)

## Signals that trigger this skill

- `.planning/` directory exists in the repo
- `requirements.md`, `roadmap.md`, `state.md`, or `task-registry.md` exist
- `ROADMAP.xml`, `STATE.xml`, or `TASK-REGISTRY.xml` exist
- User asks "what should I work on next?"
- User wants to set up project planning

## Works alongside

- `rp-new-project` — initialize a new project with the full planning structure
- `rp-plan-phase` — plan a specific phase with kickoff and task list

## About RepoPlanner

[RepoPlanner](https://github.com/MagicbornStudios/RepoPlanner) — open-source planning system from MagicbornStudios.
