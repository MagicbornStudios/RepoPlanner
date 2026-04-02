---
name: rp-verify-work
description: Verify that a completed phase actually achieved its goals — checks each definition-of-done criterion, runs verification commands, and produces a clear pass/fail report. Use this skill after executing a phase, when the user wants to confirm a feature is truly done, when closing a phase, or when checking whether all requirements were met. If gaps are found, surfaces exactly what's missing so the next execution can close them. Pairs with rp-execute-phase.
---

# Verify Work

Verifies a completed phase against its definition-of-done. Goal-backward: start from what the phase promised, check whether the code delivers it.

This is not a code review — it's a delivery check. Did the phase accomplish its stated goal? Are the requirements satisfied? Can a human verify the observable outcomes?

## Step 1: Load the DoD

Read:
1. `.planning/phases/<phase-id>/KICKOFF.md` — find `definition-of-done`, `tests-required`, `goal`
2. `.planning/phases/<phase-id>/PLAN.md` — confirm all tasks are `done`
3. `.planning/ROADMAP.md` — find success criteria for this phase (if present)
4. `.planning/REQUIREMENTS.md` — find the requirement IDs mapped to this phase

**If any task is not `done` in PLAN.md:** flag it before running the DoD check. "Task `<id>` is not complete — resolve before verifying."

## Step 2: Run verification commands

For each verification command in the task rows and kickoff DoD:

```bash
pnpm test
pnpm build
# any other stated commands
```

Report each result: pass ✓ or fail ✗ with the exact error output.

**If tests fail:** this is a gap. Record it. Do not mark pass.

## Step 3: Check observable criteria

For each item in `definition-of-done` that requires human verification:
- Describe how to verify it
- If you can check it programmatically (file exists, endpoint returns expected response), do it
- If it requires manual testing, flag it clearly

Example DoD items and how to check them:

| DoD criterion | How to check |
|---------------|-------------|
| "User can log in with email/password" | Integration test covers this, or manual test: POST /api/auth/login with valid creds returns 200 + token |
| "Protected routes reject invalid tokens" | Middleware test covers this, or curl: GET /api/profile without token returns 401 |
| "pnpm build succeeds" | Run `pnpm build` |
| "STATE.md updated" | Read STATE.md and confirm it reflects phase completion |

## Step 4: Check requirement coverage

For each requirement ID mapped to this phase (from ROADMAP.md or REQUIREMENTS.md):
- Find the test or code that satisfies it
- If no test exists and no code can be identified: this is a gap

```
REQ coverage:
  AUTH-01 ✓ — login route + test at src/auth/login.test.ts
  AUTH-02 ✓ — session middleware + test at src/auth/session.test.ts
  AUTH-03 ✗ — no test for logout persistence across refresh
```

## Step 5: Produce the report

```
## Verification: `<phase-id>`

**Goal:** <phase goal from kickoff>
**Result:** PASSED | GAPS FOUND

### Verification commands
  pnpm test ✓
  pnpm build ✓

### Definition-of-done
  [✓] <criterion 1>
  [✓] <criterion 2>
  [✗] <criterion 3> — <what's missing and where>

### Requirement coverage
  AUTH-01 ✓
  AUTH-02 ✓
  AUTH-03 ✗ — <gap description>

### Gaps
  1. <specific gap — what's missing, which file, which requirement>
  2. <specific gap>
```

## Step 6: Act on the result

**If PASSED:**

Update planning docs:
1. ROADMAP.md → phase status: `done`
2. STATE.md → advance to next phase in queue
3. Write SUMMARY.md if not already written
4. Commit: `git commit -m "docs(<phase-id>): verification passed — phase closed"`

Show: "Phase `<phase-id>` verified. Run `rp-check-todos` to find the next phase."

**If GAPS FOUND:**

Do not mark the phase done. Record gaps in ERRORS-AND-ATTEMPTS.md if the gap was caused by a failed approach, or create new tasks in TASK-REGISTRY.md to close them.

Show: "Phase `<phase-id>` has [N] gaps. Fix these before closing:

  1. <gap 1>
  2. <gap 2>

Run `rp-execute-phase` to address these gaps."

## When to run this

- After `rp-execute-phase` completes all tasks
- When a human says "I think this feature is done, can you check?"
- Before marking a phase `done` in the roadmap
- After a long gap in execution to confirm the phase still holds

## What this is not

- Not a code style review — focus on delivery against the DoD
- Not a security audit — focus on requirements coverage
- Not a performance analysis — unless performance was a stated requirement

Stay goal-backward: does the code deliver what the kickoff promised?
