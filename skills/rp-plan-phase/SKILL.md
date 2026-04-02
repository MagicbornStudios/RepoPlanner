---
name: rp-plan-phase
description: Plan a phase using the RepoPlanner methodology — creates a KICKOFF.md with goal/scope/DoD and a PLAN.md with concrete tasks. Use this skill when the user wants to plan the next phase, start planning a feature or milestone, create a task list for a phase, run a kickoff before implementation, or see what tasks are needed to achieve a phase goal. Also use it when a phase exists in the roadmap but has no tasks yet, or when a phase has been idle and assumptions may be stale. Requires repo-planner skill for the full methodology context.
---

# Plan a Phase

Creates a KICKOFF.md (phase contract) and PLAN.md (task list) for a phase from the roadmap. The kickoff prevents vague phases from producing wrong implementations. The plan breaks the goal into concrete, verifiable tasks.

## Step 1: Load context

Read the planning docs in order:

```bash
# Find the planning root
ls .planning/ 2>/dev/null || echo "No .planning/ — run rp-new-project first"
```

Read:
1. `.planning/STATE.md` — what phase are we on, what comes next
2. `.planning/ROADMAP.md` — find the target phase, its goal and requirements
3. `.planning/REQUIREMENTS.md` — understand requirement scope
4. `.planning/DECISIONS.md` — check for constraints that affect this phase

**Which phase?** If the user specified one, use that. Otherwise, find the next `planned` phase in the roadmap.

## Step 2: Run the kickoff

A kickoff is required when any of these are true:
- The phase goal is vague ("improve performance", "refactor auth")
- The phase has been idle (assumptions may have changed)
- The phase is large (rough estimate > 1 day of work)
- The phase has dependencies that aren't clearly met

Even for clear phases, a kickoff is cheap insurance against scope creep.

Ask (inline):
- "What's the specific goal of this phase? What will someone be able to do when it's done?"
- "What's explicitly not included in this phase?"
- "What are the testable conditions that make this phase complete?"
- "Any open questions before we define tasks?"

Fill in the kickoff template. See `references/kickoff-template.md` for the full structure.

Write `.planning/phases/<phase-id>/KICKOFF.md`:

```markdown
## Kickoff: `<phase-id>`

| Field | Value |
|-------|-------|
| `goal` | [one sentence] |
| `scope` | [what's included, specifically] |
| `non-goals` | [what's explicitly not in this phase] |
| `definition-of-done` | [observable conditions — tests pass, build passes, what a human can verify] |
| `tests-required` | [which tests must exist before this closes] |
| `dependencies` | [phase IDs or named things that must be done first] |
| `open-questions` | [questions to answer before or during execution] |
| `first-tasks` | [the first 2–4 task IDs] |
```

## Step 3: Break down tasks

Derive tasks from the kickoff scope and requirements. Good tasks:
- Are atomic (one logical change, one PR if needed)
- Have a clear verification command (`pnpm test`, `pnpm build`, etc.)
- Are ordered by dependency
- Use the phase ID format: `<namespace>-<stream>-<phase>-<task>`

Write `.planning/phases/<phase-id>/PLAN.md`:

```markdown
# Phase `<phase-id>`: <Phase Name>

**Goal:** [from kickoff]

## Tasks

| Id | Status | Goal | Depends | Verify |
|----|--------|------|---------|--------|
| `<phase-id>-01` | `planned` | [task goal] | `-` | `pnpm test` |
| `<phase-id>-02` | `planned` | [task goal] | `<phase-id>-01` | `pnpm test` |
| `<phase-id>-03` | `planned` | [task goal] | `<phase-id>-02` | `pnpm test && pnpm build` |

## Definition of done

[From kickoff — what a human verifies when this phase closes]

## Tests required

[From kickoff — specific test files or coverage requirements]
```

## Step 4: Update planning docs

Add the tasks to the main task registry:

In `.planning/TASK-REGISTRY.md`, add a new section:

```markdown
## Phase `<phase-id>`

**Goal:** [phase goal]

| Id | Status | Goal | Depends | Verify |
|----|--------|------|---------|--------|
| `<phase-id>-01` | `planned` | [task goal] | `-` | `pnpm test` |
...
```

Update `.planning/ROADMAP.md` to show the phase as `active` (if starting now) or leave as `planned` with a link to the kickoff.

Update `.planning/STATE.md`:

```markdown
## Current cycle

| Field | Value |
|-------|-------|
| `phase` | `<phase-id>` — [goal] |
| `focus` | kickoff complete; first tasks are <phase-id>-01, <phase-id>-02 |

## Next queue

| Priority | Action | Type |
|----------|--------|------|
| `1` | `<phase-id>-01`: [task goal] | `implementation` |
| `2` | `<phase-id>-02`: [task goal] | `implementation` |
```

## Step 5: Commit and present

```bash
git add .planning/phases/<phase-id>/ .planning/TASK-REGISTRY.md .planning/STATE.md .planning/ROADMAP.md
git commit -m "docs(<phase-id>): kickoff and task plan"
```

Present the outcome:

```
Phase `<phase-id>` planned.

Goal: [goal]

Tasks:
  <phase-id>-01: [goal]
  <phase-id>-02: [goal] (depends: -01)
  <phase-id>-03: [goal] (depends: -02)

Definition of done: [summary]
Tests required: [summary]

Start with task <phase-id>-01.
After each task: flip status in TASK-REGISTRY.md, update STATE.md focus.
When all tasks done: verify DoD, then mark phase done in ROADMAP.md.
```

## For MDX-based monorepos

Write kickoff and plan to:
```
docs/<section>/planning/plans/<phase-id>/KICKOFF.mdx
docs/<section>/planning/plans/<phase-id>/PLAN.mdx
```

Add frontmatter:
```yaml
---
title: <Phase Name> (kickoff)
taskPhase: <phase-id>
repoPath: docs/<section>/planning/plans/<phase-id>/KICKOFF.mdx
---
```

## Closing a phase

When all tasks are done:

1. Verify the definition of done — tests pass, build passes, the human check works
2. Write a SUMMARY.mdx/md: what was built, what changed, decisions made
3. Update ROADMAP.md: status → `done`, focus → "maintain only"
4. Update STATE.md: advance to next phase
5. Update TASK-REGISTRY.md: all tasks → `done`
6. Record any decisions in DECISIONS.md
7. Record any failed approaches in ERRORS-AND-ATTEMPTS.md
8. Commit: `git commit -m "docs(<phase-id>): close phase"`

## Reference files

- `references/kickoff-template.md` — full kickoff template and example
- `references/plan-quality.md` — what makes a good task list
