---
name: rp-map-codebase
description: Analyze an existing codebase and produce structured documents capturing stack, architecture, conventions, and concerns — used before planning phases in a brownfield project. Use this skill when the user wants to understand an unfamiliar codebase, when starting to plan work in an existing project that has no planning docs, when onboarding to a repo, or when beginning any phase that touches code you haven't read yet. Produces .planning/codebase/ documents that feed directly into rp-new-project and rp-plan-phase. Run once per project or when architecture changes significantly.
---

# Map Codebase

Produces a structured map of an existing codebase in `.planning/codebase/`. These documents are consumed by `rp-new-project` (brownfield requirements inference) and `rp-plan-phase` (research foundation). Run this before planning work in any repo you don't already understand.

## When to run

- Starting work in an unfamiliar repo or after a long gap
- Before running `rp-new-project` on an existing codebase
- Before planning a phase that touches a part of the code you haven't read
- When `.planning/codebase/` is missing or stale (architecture has changed significantly)

If `.planning/codebase/` already exists and is recent, check if it's still accurate before re-running — it's not free.

## Step 1: Orient quickly

```bash
# Directory structure
find . -maxdepth 3 -type d | grep -v node_modules | grep -v .git | grep -v dist

# Package manifest(s)
cat package.json 2>/dev/null || cat Cargo.toml 2>/dev/null || cat requirements.txt 2>/dev/null

# Entrypoints
ls src/ app/ pages/ cmd/ main.* index.* 2>/dev/null
```

```bash
mkdir -p .planning/codebase
```

## Step 2: Write the five documents

Work through each document in order. Each one informs the next.

---

### STACK.md

What the project is built with and why the choices matter.

```markdown
# Stack

## Runtime
- Language: <version>
- Runtime: <Node/Deno/Python/etc version>
- Package manager: <npm/pnpm/cargo/etc>

## Frameworks
| Layer | Library | Version | Notes |
|-------|---------|---------|-------|
| Web framework | Next.js | 15.x | App Router, RSC |
| Database ORM | Drizzle | 0.x | SQL-first, no magic |
| Auth | Clerk | 5.x | JWT + session bridge |
| Styling | Tailwind | 4.x | |

## Infrastructure
- Database: <Postgres/SQLite/etc>
- Storage: <local disk/S3/Supabase Storage>
- Deployment: <Vercel/Railway/self-hosted>
- CI: <GitHub Actions/etc>

## Key constraints
- <anything about the stack that shapes how new work must be done>
```

---

### ARCHITECTURE.md

How the major pieces connect.

```markdown
# Architecture

## Component map

<ASCII or description of major components and their relationships>

```
Client (Next.js RSC/RCC)
    │ HTTP
    ▼
API Routes (Next.js /api)
    │
    ├── Auth (Clerk + session bridge)
    ├── DB (Drizzle → Postgres)
    └── Storage (Payload CMS / S3)
```

## Data flow

1. User request → middleware (auth check) → RSC
2. RSC fetches → Payload REST API → Postgres
3. File upload → API route → S3 bucket

## Key boundaries

| Boundary | Rule |
|----------|------|
| Server/client | No direct DB access from client components |
| Auth | All auth state flows through session bridge |
| Storage | Media URLs always go through Payload /api/media |

## Critical paths

- <the path that must never break — login, checkout, main content render>
```

---

### CONVENTIONS.md

Patterns already established in the codebase that new work must follow.

```markdown
# Conventions

## File structure
- Components: `components/<domain>/<ComponentName>.tsx`
- API routes: `app/api/<resource>/route.ts`
- Types: colocated with usage, or `types/<domain>.ts` for shared

## Naming
- React components: PascalCase
- Hooks: `use<Name>`
- Server actions: `<verb><Resource>Action`
- DB tables: snake_case

## Patterns
- Data fetching: RSC for initial load, SWR/React Query for client-side
- Error handling: Result type `{ data, error }` at service boundaries
- Auth guard: `requireAuth()` at the top of any protected route handler

## Anti-patterns (don't do these)
- No `any` types without comment explaining why
- No direct `fetch` in components — use repository pattern
- No business logic in route handlers — delegate to service layer
```

---

### CONCERNS.md

Existing problems, risks, and areas that need attention.

```markdown
# Concerns

## Technical debt
| Area | Concern | Severity | Notes |
|------|---------|----------|-------|
| Auth | Session sync is manual | Medium | Clerk webhook + local user sync can drift |
| DB | No migration safety net | High | Drizzle push in production risks data loss |
| Types | Several `as any` casts in payment flow | Medium | |

## Known fragile areas
- <areas where bugs frequently appear or tests are thin>
- <areas where the architecture is inconsistent>

## Missing coverage
- <important code paths with no tests>

## Security notes
- <anything that affects auth, data exposure, input validation>
```

---

### STRUCTURE.md

File tree with purpose annotations for the non-obvious parts.

```markdown
# Structure

```
/
├── app/                    Next.js App Router
│   ├── (auth)/             Auth-gated route group
│   ├── api/                API route handlers
│   │   ├── auth/           Session + Clerk webhook
│   │   └── planning/       RepoPlanner cockpit routes
│   └── docs/               Docs site
├── components/             UI components
│   ├── layout/             Site chrome (Nav, SiteLayout)
│   └── ui/                 Shadcn primitives
├── content/                MDX source files
│   └── docs/               Documentation sections
├── lib/                    Server-side utilities
│   ├── payload/            Payload collections + config
│   ├── rag/                Vector search + retrieval
│   └── site-chat.ts        Chat API logic
├── .planning/              Machine planning loop (XML)
└── vendor/                 Vendored submodules
    ├── grime-time-site/    Separate product
    └── repo-planner/       Planning tooling
```

## Key files

| File | Purpose |
|------|---------|
| `payload.config.ts` | Payload CMS schema (source of truth for DB collections) |
| `next.config.ts` | Transpile config, env exposure, redirects |
| `AGENTS.md` | Agent read order for this repo |
```

---

## Step 3: Write a SUMMARY.md

After the five documents, write a brief synthesis:

```markdown
# Codebase Summary

**Generated:** <date>
**Repo:** <name>

## In one paragraph
<What this codebase is, what it does, and the most important architectural facts>

## For planning: what to know before starting

- <Key constraint 1 — e.g. "all DB writes go through Payload, not raw Drizzle">
- <Key constraint 2>
- <Key fragile area>

## Validated capabilities (what already exists)
- <List major working features — these become "Validated" requirements in rp-new-project>

## Gaps and concerns
- <From CONCERNS.md — the most important ones>
```

## Step 4: Update planning root

Add a note to STATE.md (or create it if missing):

```markdown
## Codebase map

Generated: <date>
Location: .planning/codebase/
Refresh when: architecture changes significantly or after major dependency upgrades
```

## Output

```
.planning/codebase/
  STACK.md
  ARCHITECTURE.md
  CONVENTIONS.md
  CONCERNS.md
  STRUCTURE.md
  SUMMARY.md
```

These feed into:
- `rp-new-project` — reads SUMMARY.md to infer Validated requirements
- `rp-plan-phase` — reads STACK.md + CONVENTIONS.md to ground implementation research
- `rp-execute-phase` — reads CONVENTIONS.md to stay consistent with existing patterns
