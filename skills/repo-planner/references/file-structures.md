# File Structures

Full templates for each planning doc in the 5-doc loop.

## requirements.md

```markdown
---
title: Requirements
description: Scope, goals, and constraints for <project or section>.
---

# Requirements

## Scope

One paragraph describing what this project/section covers and what it does not.

## Goals

- Goal 1
- Goal 2

## Non-goals (v1)

- Exclusion 1 — why
- Exclusion 2 — why

## Constraints

- Technical, timeline, or team constraints that shape decisions

## Requirements

### Active (v1)

| Id | Requirement | Status |
|----|-------------|--------|
| `AUTH-01` | User can log in with email/password | `planned` |
| `AUTH-02` | User session persists across browser refresh | `planned` |

### Deferred (v2+)

| Id | Requirement | Why deferred |
|----|-------------|--------------|
| `AUTH-10` | OAuth via Google | Post-launch |

### Out of scope

| Exclusion | Reason |
|-----------|--------|
| SAML SSO | Enterprise-only; not v1 |
```

---

## roadmap.md

```markdown
---
title: Roadmap
description: Phase overview for <project or section>.
---

# Roadmap

## Registry

| Field | Value |
|-------|-------|
| `section` | `<namespace>` |
| `status` | `active` |
| `scope` | one-line description of what this roadmap covers |

## Phases

| Phase | Status | Focus | Next |
|-------|--------|-------|------|
| `app-auth-01` | `active` | JWT baseline | execute `app-auth-01-03` |
| `app-auth-02` | `planned` | session revocation | plan kickoff after `app-auth-01` |
| `app-auth-03` | `planned` | OAuth | plan after `app-auth-02` |
```

Status values: `planned` / `active` / `done` / `blocked` / `deferred`

---

## state.md

```markdown
---
title: State
description: Current cycle and focus for <project or section>.
---

# State

## Registry

| Field | Value |
|-------|-------|
| `section` | `<namespace>` |
| `owner` | `<team or person>` |
| `status` | `active` |
| `updated` | `YYYY-MM-DD` |

## Current cycle

| Field | Value |
|-------|-------|
| `phase` | `app-auth-01` — JWT baseline |
| `focus` | refresh token rotation landed; session middleware is next |
| `constraint` | do not change user schema until `app-data-02` is done |

## Next queue

| Priority | Action | Type |
|----------|--------|------|
| `1` | `app-auth-01-03`: session middleware | `implementation` |
| `2` | start `app-auth-02` kickoff | `planning` |
| `3` | update API docs after session lands | `docs` |

## Cross-cutting queue

Items affecting multiple sections or not yet scoped as tasks.

| Status | Item |
|--------|------|
| `open` | Align logging format across all services |
| `done` | Shared auth library extracted (2025-03-15) |
```

---

## task-registry.md

```markdown
---
title: Task Registry
description: Active and queued tasks for <project or section>.
---

# Task Registry

## Phase `app-auth-01`

**Goal:** JWT baseline with login, logout, and session middleware.

| Id | Status | Goal | Depends | Verify |
|----|--------|------|---------|--------|
| `app-auth-01-01` | `done` | JWT signing/verification helpers | `-` | `pnpm test` |
| `app-auth-01-02` | `done` | login and logout routes | `app-auth-01-01` | `pnpm test` |
| `app-auth-01-03` | `active` | session middleware for protected routes | `app-auth-01-02` | `pnpm test && pnpm build` |

## Phase `app-auth-02`

**Goal:** Refresh token revocation so logout is durable.

| Id | Status | Goal | Depends | Verify |
|----|--------|------|---------|--------|
| `app-auth-02-01` | `planned` | token revocation table | `app-auth-01-03` | `pnpm test` |
| `app-auth-02-02` | `planned` | logout purges active tokens | `app-auth-02-01` | `pnpm test` |
```

Status values: `planned` / `active` / `done` / `blocked`

---

## decisions.md

```markdown
---
title: Decisions
description: Stable decisions for <project or section>.
---

# Decisions

## `AUTH-DEC-01` — Short-lived JWTs, long-lived refresh tokens in DB

**Decision:** JWTs expire in 15 min; refresh tokens stored in DB with 7-day sliding window.
**Why:** Stateless token verification is fast; DB-backed refresh means we can revoke sessions.
**Applies:** all auth middleware; new auth surfaces must follow this pattern.
**Decided:** 2025-03-10

---

## `AUTH-DEC-02` — No OAuth in v1

**Decision:** Email/password only for initial launch.
**Why:** OAuth adds significant scope; v1 validates the core product first.
**Applies:** requirements AUTH-10 is deferred; do not re-scope without product discussion.
**Decided:** 2025-03-10
```

---

## errors-and-attempts.md

```markdown
---
title: Errors and Attempts
description: Failed approaches and why, for <project or section>.
---

# Errors and Attempts

## `AUTH-ERR-01` — bcrypt in middleware (discarded)

**What we tried:** bcrypt.compare on every auth request in the middleware.
**Why it failed:** 100–300 ms per request; unacceptable latency at any scale.
**What to do instead:** Hash only at login/registration; verify JWT signature in middleware (microseconds).
**Phase:** `app-auth-01`

---

## `AUTH-ERR-02` — Storing JWTs in localStorage (discarded)

**What we tried:** client stored the JWT in localStorage.
**Why it failed:** XSS can read localStorage; tokens were exposed across tab contexts.
**What to do instead:** HTTP-only cookies with SameSite=Strict for JWT storage.
**Phase:** `app-auth-01`
```
