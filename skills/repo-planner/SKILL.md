---
name: repo-planner
description: The complete RepoPlanner planning methodology for AI-assisted development. Use this skill whenever you're working in a repo that has .planning/ directory, requirements.md/mdx, roadmap.md/mdx, state.md/mdx, task-registry.md/mdx, or ROADMAP.xml/STATE.xml/TASK-REGISTRY.xml — these signal the planning loop is active. Also use it when the user asks what to work on next, wants to understand the project state, needs to update planning docs, wants to set up project planning, is starting a new feature or phase, or wants to close out completed work. This is the core methodology skill — install alongside rp-new-project and rp-plan-phase for the full workflow.
---

# RepoPlanner

A planning system where humans and agents share the same source of truth. Short, structured docs that stay current — not upfront spec documents that rot.

## The 5-doc loop

Every project or section has five living documents. Read them in order before doing any work:

```
requirements → roadmap → state → task-registry → decisions
                                                        ↓
                              errors-and-attempts ←────┘
```

| Doc | What it holds | When updated |
|-----|---------------|--------------|
| `requirements` | scope, goals, non-goals, constraints | when scope changes |
| `roadmap` | phases: status, focus, what's next | when phases open/close |
| `state` | current cycle, focus, next queue, cross-cutting items | every session |
| `task-registry` | tasks by phase — id, status, goal, depends, verify | as tasks move |
| `decisions` | stable rules that emerged; do not relitigate | when a decision crystallizes |
| `errors-and-attempts` | failed approaches and why | when a path fails |

These exist as **three formats** — all are valid and often coexist:
- `.md` — standard markdown (simple repos, phase plans, grime-time, repo-planner standalone)
- `.mdx` — MDX with frontmatter (portfolio monorepo public docs site)
- `.xml` — machine-readable (CLI loop via `repo-planner` tool)

A repo may have all three simultaneously:
- `.planning/ROADMAP.xml` — machine loop (CLI)
- `docs/planning/roadmap.mdx` — human narrative

If a repo has both, the MDX is for reading/communication; the XML is what the CLI tracks. Keep them synchronized.

## Finding the planning root

**The highest `.planning/` directory in your current path is the planning root.** Walk up from cwd:

```bash
# Find the nearest planning root walking up from cwd
d=$(pwd); while [ "$d" != "/" ]; do [ -d "$d/.planning" ] && echo "$d/.planning" && break; d=$(dirname "$d"); done
```

Context narrows as you go deeper:
- Repo root `.planning/` — monorepo-wide gates, cross-project concerns
- App subdirectory `.planning/` (e.g. `vendor/grime-time-site/.planning/`) — that project's own loop
- Section MDX docs (e.g. `apps/portfolio/content/docs/<section>/planning/`) — human narrative for that section

**Multi-project overlap pattern (this portfolio monorepo):**

| Project | Planning root | Format | Scope |
|---------|--------------|--------|-------|
| Portfolio monorepo | `/.planning/` + `docs/global/planning/` | XML + MDX | cross-app gates, global phases |
| Each docs section | `docs/<section>/planning/` | MDX | section-owned work |
| `vendor/grime-time-site/` | `vendor/grime-time-site/.planning/` | XML + MD | grime-time standalone loop |
| `vendor/repo-planner/` | `vendor/repo-planner/.planning/` | XML templates | repo-planner standalone |

When working in a vendor subdirectory, that project's `.planning/` takes precedence for section-specific work. The monorepo root `.planning/` stays authoritative for cross-cutting work. If a phase appears in both, the monorepo root is the source of truth — the vendor copy is a mirror.

**MDX outside `.planning/` (portfolio pattern):**
The portfolio monorepo publishes planning docs as a public docs site. The MDX files in `apps/portfolio/content/docs/<section>/planning/` mirror the same 5-doc pattern but are human/public-facing. The `.planning/` XML is the machine loop. They must stay synchronized. When updating planning state, update both.

## Agent read order

Before any implementation work, read in this order:

1. `AGENTS.md` at repo root (if present) — check for repo-specific instructions
2. `requirements` — understand scope and what's excluded
3. `roadmap` — find active phases and what's coming
4. `state` — **this is the most important file** — it tells you exactly where you are right now and what comes next
5. `task-registry` — find the specific task IDs and their status
6. `decisions` — check for established rules before proposing anything
7. `errors-and-attempts` — check for known dead ends

If there's a `.planning/AGENTS.md`, read it too — it contains the planning-specific read order for that repo.

## State is the cockpit

State is the file you update most often and the first place you look when asked "what to do next." A good state file answers three questions immediately:

1. What phase are we in and what does it mean?
2. What is the current focus?
3. What's in the queue and in what order?

See `references/file-structures.md` for state file templates.

## Phase IDs

IDs are stable anchors across docs, commits, and chat. Use this fixed segment order:

```
<namespace>-<stream>-<phase>[-<task>]
```

| Segment | Meaning |
|---------|---------|
| `namespace` | repo or section name (e.g. `app`, `blog`, `global`, `books`) |
| `stream` | product line or concern within that namespace (e.g. `auth`, `ui`, `data`) |
| `phase` | `01`, `02`, `03` — or `01a` for a decimal insert |
| `task` | `01`, `02` within the phase (omit when naming the phase itself) |

**Examples:**
- `app-auth-01-03` — app → auth stream → phase 1 → task 3
- `blog-ui-02` — blog → UI stream → phase 2
- `global-data-03` — monorepo-wide → data stream → phase 3

Never rename a phase ID once it appears in commits or other docs.

## Phase lifecycle

Every phase has three stages:

| Stage | What must exist |
|-------|----------------|
| **Kickoff** | goal, scope, non-goals, definition-of-done, tests-required, dependencies, open questions, first tasks |
| **Execution** | roadmap row active, state pointer updated, tasks in registry, open questions tracked, decisions recorded as rules emerge |
| **Done** | requirements satisfied, DoD met, tests pass, build/lint pass, all planning docs updated |

**When to require a kickoff before starting:**
- The phase is vague (no clear goal or scope)
- The phase has been idle long enough that assumptions may be stale
- Estimated effort is large (over a configured threshold)

Run `rp-plan-phase` to generate a kickoff for any phase. See `references/kickoff-template.md`.

## Monorepo: global vs section layers

In a monorepo, planning has up to three layers:

| Layer | Location | Owns |
|-------|----------|------|
| **Global** | `.planning/*.xml`, `docs/global/` | cross-section work, shared standards, monorepo gates |
| **Section** | `docs/<section>/requirements.mdx` + `docs/<section>/planning/` | one section's scope, phases, and tasks |
| **Sub-project** | same section, extra pages | long streams inside a section without crowding the main registry |

**Rule:** if work touches only one section's code and audience, its task ID lives in that section's task registry. If it spans multiple apps, CI, or shared standards, it goes in Global.

**Cross-reference pattern:**
- Global → section: link the live path + name the phase ID
- Section → global: point at global state or task registry + name the row

## Updating planning docs after execution

After finishing a task or phase, update in this order:

1. **state** — update phase pointer, focus, advance the next queue
2. **task-registry** — flip task status, add any tasks discovered during execution
3. **decisions** — record stable rules that emerged
4. **errors-and-attempts** — log any approaches that failed
5. **roadmap** — update phase status when it closes (`done`)
6. **requirements** — update only if scope actually changed

## The cross-cutting queue

The `state` file tracks a second queue called the "cross-cutting queue" for monorepo-wide items that aren't yet a full task row. These are items that affect multiple sections or haven't been scoped yet.

Format:
```md
| Status | Item |
|--------|------|
| `open` | short description of the cross-cutting work |
| `done` | description — completed date or reference |
```

Mirror or close cross-cutting items in the task registry when they become single units of work.

## Files to look for (quick reference)

```
# Simple repo
.planning/
  ROADMAP.xml (or ROADMAP.md)
  STATE.xml (or STATE.md)
  TASK-REGISTRY.xml (or TASK-REGISTRY.md)
  DECISIONS.xml
  REQUIREMENTS.xml
  AGENTS.md
  planning-config.toml
  phases/<phase-id>/
    KICKOFF.md
    PLAN.md

# Monorepo (MDX docs)
docs/<section>/
  requirements.mdx
  planning/
    roadmap.mdx
    state.mdx
    task-registry.mdx
    decisions.mdx
    errors-and-attempts.mdx
    planning-docs.mdx   (playbook/index for this section)
    plans/<phase-id>/
      KICKOFF.mdx
      PLAN.mdx
      SUMMARY.mdx       (after phase closes)
```

## Plans are short-term documents

PLAN.md, KICKOFF.md, SUMMARY.md, and RESEARCH.md are **ephemeral** — they exist to support execution of a single phase and are not living records. They:
- Are created when a phase opens
- Are complete when the phase closes (SUMMARY.md written)
- Are never updated after the phase closes
- Should not contain information that belongs in the living 5-doc loop

When a phase closes, promote any durable knowledge out of the plan:
- Stable rules → `decisions.md`
- Failed approaches → `errors-and-attempts.md`
- Scope changes → `requirements.md`
- Phase status → `roadmap.md`

## Vendor directories

Every `vendor/` submodule is expected to have its own `.planning/` — if it's vendored, there should be a plan for it. Use the following rules when working in a repo that has a `vendor/` directory:

**If a vendor has no `.planning/`:** create and init one:
```bash
mkdir -p vendor/<slug>/.planning
# write a minimal STATE.md or STATE.xml describing the integration goal
```
Don't `.gitignore` vendor `.planning/` directories — the goal is adoption of the planning loop across every active dependency.

**If a vendor already has its own `.planning/`:** its planning root governs section-specific work. The monorepo root `.planning/` stays authoritative for cross-cutting concerns. Incorporate the vendor's existing planning as a reference:
- Add an entry for the vendor in the monorepo's `requirements` or `roadmap` that points at its planning root
- Mirror or snapshot key decisions that affect the monorepo in the monorepo's `decisions` doc (a pointer, not a copy)
- Never let two authoritative sources conflict silently — note divergences in `errors-and-attempts`

**Vendor → section mapping:** every vendor maps to either its own section (e.g. `docs/vendor-slug/planning/`) or an existing section it belongs to. If no section owns it yet, create a stub section. The mapping lives in the monorepo's `requirements` doc.

**ID namespace:** vendor phases follow the same pattern as any section — the namespace is the vendor's folder name or its section name (e.g. `grime-time`, `repo-planner`, `mb-cli-framework`).

**Quick check:**
```bash
# find vendor dirs without .planning
for d in vendor/*/; do [ -d "$d/.planning" ] || echo "NO PLANNING: $d"; done
```

## External reference writes

Sometimes execution produces documentation that doesn't fit the 5-doc loop or a plan artifact (e.g. an API reference, a runbook, a data contract, architecture diagrams).

**Before writing an external doc, ask:** can this go in `decisions.md` as a rule, or in a section's reference page instead?

When an external doc is justified, write it only if:
1. It will be referenced repeatedly after the phase closes (not just during)
2. It serves a different audience than the planning loop (operators, end users, other teams)
3. It would be too long to embed in decisions without degrading its readability

Place it in the section's reference area (not under `planning/`):
- Simple repo: `docs/<topic>.md`
- Monorepo: `apps/portfolio/content/docs/<section>/<topic>.mdx`
- Note its existence in the decisions or task that produced it

Minimal rule: **if it's not referenced after the phase closes, don't write it.**

## Reference files

- `references/file-structures.md` — full file templates for all 5 docs
- `references/kickoff-template.md` — kickoff doc template
- `references/monorepo-setup.md` — multi-section monorepo layout
