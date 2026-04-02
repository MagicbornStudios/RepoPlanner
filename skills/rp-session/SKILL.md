---
name: rp-session
description: Save and restore full planning context across sessions — creates a handoff file when pausing and restores from it when resuming. Use this skill when the user is about to stop work mid-phase, wants to hand off to a new context window, is starting a new session and needs to orient fully, or when rp-check-todos alone isn't enough because there's in-progress work, unresolved decisions, or active blockers that aren't captured in the living planning docs. Essential for the autonomous execution loop — call it at pause and resume to maintain continuity.
---

# Session Continuity

Saves and restores full working context for the autonomous execution loop. The planning docs (state, task-registry, etc.) capture completed work — this skill captures the *in-flight* state: what's partially done, decisions made mid-task, blockers encountered, and where to resume.

## Detecting mode

**Pause mode:** user is about to stop work, end session, or hand off.

**Resume mode:** user is starting a new session or context was reset. Check for a handoff file:

```bash
ls .planning/session.md 2>/dev/null && echo "HANDOFF EXISTS" || echo "NO HANDOFF"
```

If handoff exists → resume mode. If not → check `rp-check-todos` for orientation (likely a clean start).

---

## Pause: creating the handoff

Write `.planning/session.md` with the complete in-flight context:

```markdown
# Session Handoff

**Saved:** <date and time>
**Phase:** `<current-phase-id>` — <phase goal>

## Position

| Field | Value |
|-------|-------|
| Current task | `<task-id>` — <task goal> |
| Task status | in-progress / blocked / just-completed |
| Last action | <what was the last thing done — be specific> |
| Next action | <exactly what to do when resuming — be prescriptive> |

## In-progress work

<Describe any work that was started but not committed. What files were changed? What's the incomplete state?>

Uncommitted changes:
- `<file>` — <what was changed and why it's not committed yet>

## Decisions made this session

These decisions were made mid-execution but not yet recorded in decisions.md:

| Decision | What was decided | Why |
|----------|-----------------|-----|
| <topic> | <choice made> | <reason> |

Record these in decisions.md on resume.

## Open questions

Questions encountered mid-execution that need an answer before continuing:

| Question | Blocking? | Context |
|----------|-----------|---------|
| <question> | yes/no | <why it matters> |

## Blockers

| Blocker | Severity | What's needed to unblock |
|---------|----------|--------------------------|
| <blocker description> | blocking/non-blocking | <what resolves it> |

## Context that won't survive the reset

Things that were in working memory but aren't in any file:

- <anything that would be lost — reasoning, tradeoffs considered, why a specific approach was chosen>

## Verify state before resuming

Run these commands on resume to confirm the environment is correct:

```bash
pnpm test                    # confirm test suite still passes
git status                   # check for uncommitted changes
git log --oneline -5         # orient to recent commits
```
```

---

## Resume: restoring context

### Step 1: Read the handoff

```bash
cat .planning/session.md
```

Read it completely before doing anything else.

### Step 2: Orient to current file state

Run the verify commands from the handoff:
```bash
pnpm test 2>/dev/null || echo "No test command found"
git status --short
git log --oneline -5
```

Check if any uncommitted changes from the handoff are still present. If not, they were lost — note this.

### Step 3: Reconcile

Compare the handoff's "Position" to the current state of:
- TASK-REGISTRY.md — is the current task still the same status?
- STATE.md — does focus match the handoff?

If they diverge, trust the handoff's description of in-progress work (it's more recent than the last commit to planning docs).

### Step 4: Record deferred decisions

If the handoff contains decisions made mid-session that weren't yet written to decisions.md, record them now before resuming execution:

```bash
# Open decisions.md and add each decision from the handoff
```

### Step 5: Resume

Present the restored context clearly:

```
Resuming from session handoff.

Phase: `<phase-id>` — <goal>
Last action: <what was done>
Next action: <exactly what to do>

Blockers: <any blocking issues>
Open questions: <any unanswered questions>

Ready to continue.
```

Then proceed directly to the next action without asking "where were we?" — the handoff answers that.

### Step 6: Clean up the handoff

Once the session is fully active and the next task is underway, archive the handoff:

```bash
mv .planning/session.md .planning/session-archive-<date>.md
```

Or delete it — it served its purpose. Don't let old handoffs accumulate (they become misleading).

---

## Integration with the execution loop

The session handoff is designed to survive context resets in the autonomous ralph loop:

```
rp-execute-phase (task N) → context limit approaching
  → rp-session pause (write session.md)
  → fresh context window
  → rp-session resume (read session.md)
  → rp-execute-phase (continue from task N)
```

The handoff file is the bridge. Without it, the loop would have to re-read all planning docs and infer the in-flight state, which is slower and lossy. With it, the loop picks up exactly where it left off.

## When rp-check-todos is enough instead

If the session ended cleanly (all tasks completed, state updated, no in-progress work), `rp-check-todos` is sufficient for re-entry — no handoff needed. Use `rp-session` only when there's in-flight state that the living docs don't capture.
