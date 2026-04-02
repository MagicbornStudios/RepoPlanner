# RepoPlanner Skills

Six agent skills that give Claude the full RepoPlanner planning loop — from project init through autonomous phase execution. Together they enable a "plan once, execute without interruption" workflow.

## The loop

```
rp-new-project → rp-plan-phase → rp-execute-phase → rp-verify-work
                      ↑                                     |
                 rp-check-todos ←─────────────────────────┘
```

`rp-check-todos` is the re-entry point. Call it anytime to orient, including after a context reset.

## Install

```bash
# Core methodology (required — install this first)
npx skills add MagicbornStudios/RepoPlanner/skills/repo-planner

# Full loop
npx skills add MagicbornStudios/RepoPlanner/skills/rp-new-project
npx skills add MagicbornStudios/RepoPlanner/skills/rp-plan-phase
npx skills add MagicbornStudios/RepoPlanner/skills/rp-execute-phase
npx skills add MagicbornStudios/RepoPlanner/skills/rp-verify-work
npx skills add MagicbornStudios/RepoPlanner/skills/rp-check-todos
```

## Skills

| Skill | When to use | Install |
|-------|-------------|---------|
| `repo-planner` | Core methodology — always install first | `MagicbornStudios/RepoPlanner/skills/repo-planner` |
| `rp-new-project` | Initialize a new project with full planning structure | `MagicbornStudios/RepoPlanner/skills/rp-new-project` |
| `rp-plan-phase` | Plan a phase: kickoff + task list | `MagicbornStudios/RepoPlanner/skills/rp-plan-phase` |
| `rp-execute-phase` | Execute a planned phase atomically to completion | `MagicbornStudios/RepoPlanner/skills/rp-execute-phase` |
| `rp-verify-work` | Verify a phase achieved its goals before closing | `MagicbornStudios/RepoPlanner/skills/rp-verify-work` |
| `rp-check-todos` | Find the single best next action from current state | `MagicbornStudios/RepoPlanner/skills/rp-check-todos` |

## Why 6 and no more

Each skill owns exactly one step in the loop. More skills would dilute triggering accuracy and create overlap. The `repo-planner` methodology skill provides the context that makes the other five work — install it first.

## Autonomous execution

These skills are designed to support uninterrupted execution. With a well-planned project:

1. Run `rp-new-project` once to set up requirements and roadmap
2. Run `rp-plan-phase` for each phase to create kickoffs and task lists
3. Hand off to an autonomous agent that loops: `rp-check-todos` → `rp-execute-phase` → `rp-verify-work` → repeat

The planning docs act as shared memory across context resets — the agent always knows where it is.

## About RepoPlanner

[RepoPlanner](https://github.com/MagicbornStudios/RepoPlanner) is an open-source planning system: XML planning templates, a `repo-planner` CLI, and an embeddable Next.js cockpit.
