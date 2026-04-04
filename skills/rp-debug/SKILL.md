---
name: rp-debug
description: Systematic debugging using the scientific method — form hypotheses, test them, eliminate dead ends, and find root causes. Use this skill whenever the user reports a bug, unexpected behavior, test failure, build error, or anything that "should work but doesn't." Also use it when execution hits an unexpected blocker mid-phase, when a verification command produces confusing output, or when multiple debugging attempts have failed and you need a structured approach. Maintains a persistent debug session file so investigation survives context resets.
---

> **Deprecated:** Use `gad:debug` instead. This skill remains for backwards compatibility but `gad:` is the preferred prefix.

# Debug

Systematic debugging using the scientific method. Investigation burns context fast — this skill keeps the process structured and the findings durable across context resets.

The pattern: gather symptoms → form the minimal set of hypotheses → test each to eliminate → confirm root cause → fix or hand off.

## Step 1: Check for active sessions

```bash
ls .planning/debug/*.md 2>/dev/null | grep -v resolved
```

If active sessions exist and no new issue was described, list them:
```
Active debug sessions:
  1. auth-session-null (2025-04-01) — hypothesis: middleware not reading cookie
  2. build-css-error (2025-04-02) — root cause found, awaiting fix
```

Ask: resume one or start a new investigation?

## Step 2: Gather symptoms (new issue)

Ask these directly (not as a form — conversational):

1. **What should happen?**
2. **What actually happens?** (exact error message or behavior)
3. **How do you reproduce it?** (steps or command)
4. **When did it start?** (always broken? worked before a recent change?)
5. **What have you already tried?**

Create a slug from the issue: `auth-session-null`, `build-css-error`, `api-500-on-login`.

Write `.planning/debug/<slug>.md`:

```markdown
# Debug: <slug>

**Status:** investigating
**Started:** <date>

## Symptoms

- Expected: <what should happen>
- Actual: <what happens instead>
- Reproduction: <steps>
- Timeline: <when it started>
- Already tried: <prior attempts>

## Hypotheses

*(fill in step 3)*

## Investigation log

*(fill in step 4)*

## Root cause

*(fill in when found)*
```

## Step 3: Form hypotheses

Based on symptoms, generate 3–5 candidate root causes ranked by likelihood. Write them to the debug file:

```markdown
## Hypotheses

| # | Hypothesis | Likelihood | How to test |
|---|-----------|-----------|-------------|
| 1 | Middleware not reading HttpOnly cookie | High | Log req.cookies in middleware |
| 2 | JWT expiry too short, token expired in flight | Medium | Check token expiry vs request timing |
| 3 | Cookie domain mismatch (localhost vs 127.0.0.1) | Medium | Compare Set-Cookie header domain to request origin |
| 4 | Auth route not setting cookie at all | Low | Check Set-Cookie in login response headers |
```

**Good hypotheses:**
- Are specific (name the file, function, or mechanism)
- Have a clear test that would confirm or eliminate them
- Are ordered: test cheapest/most likely first

**Don't:**
- Form vague hypotheses ("something wrong with auth")
- Skip straight to fixes without confirming root cause
- Re-test hypotheses already eliminated

## Step 4: Test hypotheses (investigation loop)

For each hypothesis, from most to least likely:

### 4a. Test

Run the cheapest test that could eliminate it:
- Read the relevant code
- Add temporary logging
- Run a targeted command
- Inspect a specific file or output

### 4b. Record findings

Update the debug file investigation log:

```markdown
## Investigation log

**H1 test (middleware cookie read):**
Read `src/middleware/auth.ts:42` — `req.cookies` is empty object `{}`.
Cookie IS set by login (`Set-Cookie: token=...` visible in network tab).
→ Middleware is not parsing cookies. No cookie parser middleware loaded.

**H2 test (JWT expiry):** ELIMINATED — token was just issued, expiry is 15 min.

**H3 test (domain mismatch):** ELIMINATED — both using localhost.
```

### 4c. Eliminate or confirm

- If a test **eliminates** the hypothesis: mark `ELIMINATED`, move to next
- If a test **confirms** the root cause: write `ROOT CAUSE CONFIRMED` and stop testing
- If a test is **inconclusive**: form a more specific sub-hypothesis and continue

### 4d. Handle dead ends

If 3+ hypotheses are eliminated and no root cause found:
1. Check errors-and-attempts.md for similar past failures
2. Re-examine symptoms — was the reproduction accurate?
3. Expand scope: is the failure earlier in the stack than assumed?
4. Record the dead end in the debug file and surface to user before continuing

## Step 5: Confirm root cause

When a hypothesis is confirmed, write the root cause clearly:

```markdown
## Root cause

**Confirmed:** No cookie parser middleware loaded before auth middleware.

`express-cookieparser` (or equivalent) must run before any middleware that reads `req.cookies`.
`src/server.ts` registers auth middleware before cookie parser — order matters.

**Minimal fix:** Move cookie parser registration above auth middleware in `src/server.ts`.
**Better fix:** Consolidate middleware registration order in a single `middleware.ts` file with explicit ordering comments.
```

## Step 6: Offer next action

```
Root cause confirmed: <one-line summary>

Fix options:
  1. Fix now — implement minimal fix
  2. Plan it — create a task in TASK-REGISTRY.md for the next session
  3. Document only — record in errors-and-attempts.md, handle manually

What's your call?
```

**If fixing now:**
- Implement the fix
- Run the verify command from the failing task (or `pnpm test`)
- Confirm the symptom is resolved
- Mark the debug session resolved: rename to `.planning/debug/resolved-<slug>.md`
- Record the failure pattern in `errors-and-attempts.md` to prevent recurrence

**If creating a task:**
- Add to TASK-REGISTRY.md with the root cause and confirmed fix approach in the goal
- Link from the debug file
- Update STATE.md if this is blocking the current phase

## Session persistence

The debug file at `.planning/debug/<slug>.md` is the memory of the investigation. If context resets mid-investigation:

```bash
cat .planning/debug/<slug>.md
```

Pick up from the last recorded hypothesis test. Don't re-test eliminated hypotheses.

If the session was started mid-phase (during rp-execute-phase), update STATE.md to note the blocker:

```markdown
| `focus` | blocked on `<slug>` — see `.planning/debug/<slug>.md` |
```

## Reference files

- `references/investigation-patterns.md` — patterns for common failure types (build errors, runtime errors, test failures, network issues)
