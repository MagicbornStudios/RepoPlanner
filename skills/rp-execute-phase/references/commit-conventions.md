# Commit Conventions

## Format

```
<type>(<phase-id>): <imperative summary>
```

## Types

| Type | When |
|------|------|
| `feat` | adds new capability (new route, new component, new behavior) |
| `fix` | corrects existing behavior that was wrong |
| `refactor` | restructures code without changing behavior |
| `test` | adds or updates tests only |
| `docs` | updates planning docs, READMEs, or comments |
| `chore` | dependency updates, config changes, tooling |

## Examples

```
feat(app-auth-01): add JWT signing and verification helpers
test(app-auth-01): add unit tests for JWT helpers
feat(app-auth-01): add login route returning JWT and refresh token cookie
feat(app-auth-01): add logout route clearing session cookies
feat(app-auth-01): add session middleware for protected routes
docs(app-auth-01): close phase — kickoff DoD verified
```

## Rules

- Use imperative mood: "add" not "added", "fix" not "fixed"
- Summary is ≤72 characters
- Phase ID in parens links the commit to planning docs
- One logical change per commit — if the diff spans multiple concerns, split it
- Never bundle a task implementation with planning doc updates in the same commit; commit docs separately

## Planning doc commits

```
docs(<phase-id>): add kickoff and task plan
docs(<phase-id>): mark task <N> done
docs(<phase-id>): close phase — all DoD criteria met
```
