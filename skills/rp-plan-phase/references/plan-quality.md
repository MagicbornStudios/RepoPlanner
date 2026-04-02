# Plan Quality

What makes a good task list for a phase.

## Properties of good tasks

**Atomic** — one logical change per task. A task should produce a coherent diff or PR.
- Good: "Add JWT signing helper with sign, verify, and expiry functions"
- Bad: "Implement all auth" (too broad) or "Add `sign` function to jwt.ts line 12" (too narrow)

**Verifiable** — every task has a concrete verify command.
- `pnpm test` — runs the test suite
- `pnpm build` — confirms the build passes
- `pnpm exec tsc --noEmit` — type-check only
- Manual: "GET /api/health returns 200 in browser"

**Ordered by dependency** — tasks that unlock other tasks come first. Mark dependencies explicitly in the `Depends` column with the task ID.

**Named after the goal, not the file** — 
- Good: "Login route returns JWT and refresh token cookie"
- Bad: "Edit apps/api/src/routes/auth.ts"

## Task count per phase

- **2–4 tasks** — lean phase, clear scope, moves fast
- **5–8 tasks** — standard phase
- **9+ tasks** — consider splitting into sub-phases (e.g. `app-auth-01` and `app-auth-01a`)

If a phase looks like 15+ tasks, the scope is too broad. Split at natural boundaries.

## Wave structure (for parallel execution)

Group tasks into waves — tasks in the same wave can run in parallel:

```markdown
## Wave 1 (parallel)
- app-auth-01-01: JWT signing helpers
- app-auth-01-02: User lookup utility

## Wave 2 (after wave 1)
- app-auth-01-03: Login route (uses JWT helpers + user lookup)

## Wave 3 (after wave 2)
- app-auth-01-04: Session middleware (uses login route output)
- app-auth-01-05: Integration tests for all routes
```

Only use waves if tasks genuinely can run in parallel. Single-dependency chains don't need wave structure.

## Verify commands

| Situation | Command |
|-----------|---------|
| General | `pnpm test` |
| Also verify build | `pnpm test && pnpm build` |
| Type-check only | `pnpm exec tsc --noEmit` |
| Single test file | `pnpm test -- src/auth/jwt.test.ts` |
| Manual UI check | describe what to verify in the browser |

Always run verify commands yourself before marking a task done.

## Definition of done for a task vs a phase

**Task done:** verify command passes, no test regressions, code review if applicable.

**Phase done:** all tasks done + the definition-of-done from the kickoff is satisfied. This often includes:
- Tests at the integration or E2E level (not just unit tests)
- A successful `pnpm build`
- Planning docs updated (state, roadmap, task registry)
- Any decisions recorded in DECISIONS.md
