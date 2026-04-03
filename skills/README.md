# RepoPlanner Skills

Six agent skills that give Claude the full RepoPlanner planning loop — from project init through autonomous phase execution. Together they enable a "plan once, execute without interruption" workflow.

## The loop

```
rp-new-project → rp-plan-phase → rp-execute-phase → rp-verify-work
      ↑                ↑                                     |
 rp-milestone    rp-add-todo                          rp-check-todos
                 rp-quick                                    |
                 rp-debug ←──── (when things break) ────────┘
```

`rp-check-todos` is the re-entry point after any context reset. `rp-session` is the bridge when pausing mid-phase.

## Install all 13

```bash
npx skills add MagicbornStudios/RepoPlanner/skills/repo-planner
npx skills add MagicbornStudios/RepoPlanner/skills/rp-new-project
npx skills add MagicbornStudios/RepoPlanner/skills/rp-plan-phase
npx skills add MagicbornStudios/RepoPlanner/skills/rp-execute-phase
npx skills add MagicbornStudios/RepoPlanner/skills/rp-verify-work
npx skills add MagicbornStudios/RepoPlanner/skills/rp-check-todos
npx skills add MagicbornStudios/RepoPlanner/skills/rp-debug
npx skills add MagicbornStudios/RepoPlanner/skills/rp-map-codebase
npx skills add MagicbornStudios/RepoPlanner/skills/rp-session
npx skills add MagicbornStudios/RepoPlanner/skills/rp-milestone
npx skills add MagicbornStudios/RepoPlanner/skills/rp-add-todo
npx skills add MagicbornStudios/RepoPlanner/skills/rp-quick
npx skills add MagicbornStudios/RepoPlanner/skills/rp-manuscript
```

## Skills

| Skill | When to use |
|-------|-------------|
| `repo-planner` | **Install first.** Core methodology, planning root discovery, 3 file formats, monorepo layers |
| `rp-new-project` | Initialize a new project — requirements, roadmap, state |
| `rp-plan-phase` | Plan a phase — kickoff contract + task list before execution |
| `rp-execute-phase` | Execute a phase atomically, task by task, with commits |
| `rp-verify-work` | Verify a phase hit its goals before closing |
| `rp-check-todos` | Find the best next action — re-entry after any context reset |
| `rp-debug` | Systematic debugging — hypothesis tracking, persistent session |
| `rp-map-codebase` | Analyze existing code — produces STACK, ARCH, CONVENTIONS, CONCERNS |
| `rp-session` | Pause/resume mid-phase — bridges context resets in the autonomous loop |
| `rp-milestone` | Audit milestone completeness, close it (archive + tag), start the next |
| `rp-add-todo` | Capture an idea mid-session without losing flow |
| `rp-quick` | Fast-path for ad-hoc tasks that don't belong in the roadmap |
| `rp-manuscript` | Fiction/creative writing adaptation — manuscript loop, beat sheets, canon locks, chapter done checklist |

## Autonomous execution

With a fully planned project, an autonomous agent can loop without interruption:

1. `rp-map-codebase` once for brownfield repos
2. `rp-new-project` to define requirements and roadmap
3. For each phase: `rp-plan-phase` → `rp-execute-phase` → `rp-verify-work`
4. `rp-check-todos` at any re-entry point
5. `rp-session` to bridge context resets mid-phase
6. `rp-debug` when anything breaks
7. `rp-milestone` when all phases are done and the cycle closes

The planning docs are the shared memory. Even after a full context reset, any skill can re-orient from the files alone.

## About RepoPlanner

[RepoPlanner](https://github.com/MagicbornStudios/RepoPlanner) is an open-source planning system: XML planning templates, a `repo-planner` CLI, and an embeddable Next.js cockpit.
