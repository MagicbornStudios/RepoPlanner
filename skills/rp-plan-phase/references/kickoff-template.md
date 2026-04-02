# Kickoff Template

A kickoff is a lightweight phase-start contract. Write it before implementation starts.

## When a kickoff is required

- Phase goal is vague ("improve performance", "refactor auth")
- Phase has been idle long enough that assumptions may be stale
- Phase is large (rough estimate > 1 day of work)
- Phase has dependencies that aren't clearly met

Even for clear phases, a kickoff is cheap insurance.

## Template

```markdown
## Kickoff: `<phase-id>`

| Field | Value |
|-------|-------|
| `goal` | One sentence. What does this phase deliver? |
| `scope` | What work is included. Be specific. |
| `non-goals` | What is explicitly NOT in this phase. Prevents scope creep. |
| `definition-of-done` | Observable conditions for "done": tests pass, build passes, what a human verifies. |
| `tests-required` | Which test files or coverage must exist before this phase closes. |
| `dependencies` | Phase IDs or named things that must be complete first. |
| `open-questions` | Questions to answer before or during execution. Track status: open / answered. |
| `first-tasks` | The first 2–4 task IDs that start execution. |
```

## Example

```markdown
## Kickoff: `app-auth-01`

| Field | Value |
|-------|-------|
| `goal` | Ship JWT-based login, logout, and session middleware so protected routes work. |
| `scope` | JWT signing helpers, login route, logout route, session middleware. |
| `non-goals` | Password reset, OAuth, 2FA, admin roles, multi-tenant. |
| `definition-of-done` | Login returns JWT + refresh token cookie; logout clears both; middleware rejects invalid tokens; all tests pass; `pnpm build` succeeds. |
| `tests-required` | Unit tests for JWT helpers; integration tests for login and logout routes; middleware test with valid and invalid tokens. |
| `dependencies` | User table exists (`app-data-01-02` done). |
| `open-questions` | Token expiry: 15 min or 1 hour? (open) · Cookie SameSite setting for staging? (open) |
| `first-tasks` | `app-auth-01-01`, `app-auth-01-02`, `app-auth-01-03`. |
```

## Open questions lifecycle

Open questions stay in the kickoff until answered. When answered, record the decision in `DECISIONS.md` and mark the question `answered`:

| Question | Status | Answer |
|----------|--------|--------|
| Token expiry: 15 min or 1 hour? | `answered` | 15 min — see `AUTH-DEC-01` |
| Cookie SameSite for staging? | `open` | — |

Questions don't block execution unless they affect the current task. Track them anyway — unresolved questions at phase close are a signal to review before calling the phase done.

## Definition of done checklist

A strong DoD answers:
- What tests must pass?
- What build/lint commands must succeed?
- What can a human observe to confirm it works?
- Are there planning doc updates required?

Weak DoD: "feature is implemented"
Strong DoD: "user can log in with email/password and stay logged in across browser refresh; logout clears the session; all unit and integration tests pass; `pnpm test && pnpm build` succeeds; STATE.md updated"
