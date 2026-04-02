---
name: rp-check-todos
description: Read current planning state and surface the single best next task or action — the re-entry point for any autonomous loop. Use this skill when the user asks "what should I work on next?", "what's the status?", "where are we?", "what's next?", or starts a new session and needs to orient. Also use it to find the next task after completing one, or to decide whether to plan a new phase or execute an existing one. This is the navigation skill — run it between every phase and after any context reset.
---

# Check Todos

Reads planning state and surfaces the single best next action. This is the re-entry skill for any execution loop — run it whenever you need to orient or after any context reset.

## Step 1: Read state

```bash
cat .planning/STATE.md
```

Extract:
- Current phase ID and goal
- Current focus
- Next queue (priority-ordered)

## Step 2: Check the phase's actual status

```bash
cat .planning/ROADMAP.md
```

Find the current phase row. What's its status — `planned`, `active`, `blocked`, `done`?

Then check the task registry:
```bash
cat .planning/TASK-REGISTRY.md
```

For the current phase, what's the first task that isn't `done`?

## Step 3: Determine the next action

Walk through this decision tree:

### Case A: No .planning/ directory
→ "No planning docs found. Run `rp-new-project` to initialize."

### Case B: Planning exists but no active phase
→ Find the first `planned` phase in ROADMAP.md
→ "Next: run `rp-plan-phase` for Phase `<id>` — `<goal>`"

### Case C: Active phase with a PLAN.md
→ Find the first `planned` or `active` task in PLAN.md
→ "Next task: `<task-id>` — `<goal>`. Verify with: `<verify command>`."

### Case D: Active phase but no PLAN.md
→ "Phase `<id>` is active but has no plan. Run `rp-plan-phase` to create tasks."

### Case E: All tasks in current phase are `done`
→ Check if KICKOFF.md has a definition-of-done that hasn't been verified
→ "Phase `<id>` tasks complete. Run `rp-verify-work` to verify and close."

### Case F: Current phase is `done`, next phase exists
→ Find next `planned` phase
→ "Phase `<prev-id>` is done. Next: run `rp-plan-phase` for Phase `<next-id>` — `<goal>`."

### Case G: Cross-cutting items in state queue
→ Surface any `open` items in the cross-cutting queue that should come before next phase work

## Step 4: Present the answer

Keep it tight. One clear next action. Don't surface everything at once.

```
## Current state

Phase: `<phase-id>` — <goal>
Status: <active | planned | done>
Focus: <current focus from STATE.md>

## Next action

<single recommended action with the exact task ID or skill to run>

  Task: `<task-id>` — <goal>
  Verify: <command>

## Also in queue

  2. <next priority>
  3. <next priority>
```

If there's nothing in queue and all phases are done:

```
## All phases complete

Requirements covered: [list]
Next: start a new milestone or run `rp-new-project` for a new project.
```

## For autonomous loop use

This skill is designed to be called at the start of any execution loop. A ralph-style autonomous loop looks like:

```
while not done:
  action = rp-check-todos()
  if action == "plan":
    rp-plan-phase(phase)
  elif action == "execute":
    rp-execute-phase(phase)
  elif action == "verify":
    rp-verify-work(phase)
  elif action == "done":
    break
```

The planning docs are the shared memory across loop iterations. Even after a context reset, `rp-check-todos` can re-orient from the files alone.

## What makes this work

The state doc must be current. If STATE.md hasn't been updated after the last task, `rp-check-todos` will surface stale information. After any execution, update STATE.md before ending the session.

This is why every skill in the RepoPlanner system updates STATE.md as part of its close step — so re-entry always works from an accurate picture.
