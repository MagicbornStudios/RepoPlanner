# Kickoff Template

A kickoff is a lightweight phase-start contract. Write it before implementation, not after.

The kickoff exists because vague phases produce wrong implementations. A 15-minute kickoff that answers "what are we actually building and when are we done?" prevents days of rework.

## Template

```markdown
## Kickoff: `<phase-id>`

| Field | Value |
|-------|-------|
| `goal` | One sentence. What does this phase deliver? |
| `scope` | What work is included. Be specific about what IS in scope. |
| `non-goals` | What is explicitly NOT in this phase. Prevents scope creep. |
| `definition-of-done` | The observable conditions that make this phase complete. Tests pass. Build passes. What a human can verify. |
| `tests-required` | Which tests must exist before this phase closes. Executable work is not done without tests. |
| `dependencies` | Phase IDs or named things that must be complete before this phase starts. |
| `open-questions` | Questions that must be answered before or during execution. Track with `open` / `answered` status. |
| `first-tasks` | The first 2–4 task IDs that start execution. |
```

## Example

```markdown
## Kickoff: `app-auth-01`

| Field | Value |
|-------|-------|
| `goal` | Ship JWT-based login, logout, and session middleware so protected routes work. |
| `scope` | JWT signing helpers, login/logout routes, session middleware. Password reset is NOT included. |
| `non-goals` | OAuth, 2FA, admin role system, multi-tenant accounts. |
| `definition-of-done` | Login returns a JWT and refresh token cookie; logout clears both; middleware rejects requests with invalid tokens; all unit tests pass; `pnpm build` succeeds. |
| `tests-required` | Unit tests for JWT helpers (sign, verify, expiry); integration test for login/logout routes; middleware test with valid and invalid tokens. |
| `dependencies` | User table must exist (`app-data-01-02` done). |
| `open-questions` | Token expiry duration — 15 min or 1 hour? (open) / Cookie domain for staging — share with API? (open) |
| `first-tasks` | `app-auth-01-01`, `app-auth-01-02`, `app-auth-01-03`. |
```

## Open questions format

Open questions stay in the kickoff doc until answered. When answered, record the decision in `decisions.md` and mark the question `answered`:

```markdown
| Question | Status | Answer |
|----------|--------|--------|
| Token expiry duration — 15 min or 1 hour? | `answered` | 15 min — see `AUTH-DEC-01` |
| Cookie domain for staging | `open` | — |
```

Questions don't block execution unless they directly affect the current task. Track them anyway — unresolved questions at phase close are a signal to review.

## File location

Store kickoffs at:
- Simple repo: `.planning/phases/<phase-id>/KICKOFF.md`
- Monorepo (MDX): `docs/<section>/planning/plans/<phase-id>/KICKOFF.mdx`
- XML-based monorepo: `.planning/phases/<phase-id>/KICKOFF.md`
