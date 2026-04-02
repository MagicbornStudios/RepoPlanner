---
name: rp-quick
description: Execute a quick ad-hoc task with planning guarantees (atomic commit, STATE update) but without the full phase ceremony — no kickoff, no research, no plan-checker. Use this skill for small fixes, chores, hotfixes, dependency updates, documentation patches, or any self-contained task that doesn't belong in the roadmap and can be clearly described in one sentence. Also use it when the user says "quick fix", "just change X", "can you update Y", or describes a task that's clearly scoped and under ~30 minutes. Keeps the task registry and roadmap clean by handling ad-hoc work in a separate lane.
---

# Quick Task

Fast path for self-contained ad-hoc work. Same guarantees as `rp-execute-phase` (atomic commit, state update, verify) without the phase scaffolding. Lives in `.planning/quick/` — separate from the roadmap so the milestone stays clean.

## Is this the right skill?

Use `rp-quick` when the task is:
- ✅ Clearly scoped in one sentence
- ✅ Self-contained (no dependencies on unfinished phases)
- ✅ Under ~30 min of work
- ✅ Doesn't introduce new requirements or change the roadmap

Use `rp-plan-phase` instead when:
- ❌ The task needs a kickoff (scope is unclear)
- ❌ Multiple steps with dependencies
- ❌ Changes requirements or product direction
- ❌ Part of a planned phase (just use the phase task)

## Step 1: Define the task

Confirm with the user (or infer from context):
- **What:** one-sentence description of the change
- **Verify:** how to confirm it's done (`pnpm test`, `pnpm build`, manual check)
- **Files:** which files are likely affected (rough estimate)

## Step 2: Generate a task ID

Quick tasks use a simple format: `quick-<YYYY-MM-DD>-<slug>`

Example: `quick-2025-04-02-bump-swr-dep`

## Step 3: Log it

```bash
mkdir -p .planning/quick
```

Write `.planning/quick/<id>.md`:

```markdown
# Quick: <id>

**Status:** in-progress
**Date:** <date>

## Task

<one-sentence description>

## Verify

<verify command or manual check>
```

## Step 4: Execute

Implement the change. Stay strictly within scope — if you discover the task is larger than expected, stop, note it, and surface to the user rather than expanding.

Check DECISIONS.md and CONVENTIONS.md (from `rp-map-codebase`) before changing anything — quick tasks that ignore established conventions create quiet drift.

## Step 5: Verify

Run the verify command. If it fails, fix it. If the fix requires more than ~30 min, this is no longer a quick task — convert to a phase:

```
This fix is larger than expected. Stopping quick execution.
Creating a task in TASK-REGISTRY.md for proper phase planning.
```

## Step 6: Commit

```bash
git add <specific files>
git commit -m "chore(<slug>): <task description>"
```

For quick tasks, use `chore`, `fix`, or `docs` commit types. Never `feat` — if it's a feature, it belongs in a phase.

## Step 7: Update state

Mark the quick task done:

```markdown
# Quick: <id>
**Status:** done
```

Update STATE.md next queue — remove the quick task from focus and surface the next planned phase:

```markdown
## Next queue
| Priority | Action | Type |
|----------|--------|------|
| `1` | resume `<current-phase-id>` — quick task complete | `implementation` |
```

## Step 8: Confirm

```
Quick task complete: <id>

<one-line summary of what was done>
Committed: <commit hash short>
Verified: <verify command> ✓

Returning to: <current phase and task>
```

## Accumulation check

Quick tasks in `.planning/quick/` shouldn't pile up. If there are more than 5 done quick tasks, `rp-check-todos` will surface a suggestion to clean the directory. Reviewing quick task history can also reveal recurring problems worth addressing at the phase level.
