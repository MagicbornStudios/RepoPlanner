---
name: rp-milestone
description: Manage the full milestone lifecycle — start a new milestone (new version, new cycle), audit a completed one for gaps before archiving, and close it out with git tag and state reset. Use this skill when the user says "we're starting v2", "let's kick off the next release", "we finished everything in this milestone, what's next", "archive this milestone", or wants to review whether all planned work is actually done before closing. Also use it when all phases in the roadmap are marked done and you need to decide whether to start fresh planning or close out. Covers gsd:new-milestone + gsd:complete-milestone + gsd:audit-milestone.
---

> **Deprecated:** Use `gad:audit-milestone / gad:new-milestone / gad:complete-milestone` instead. This skill remains for backwards compatibility but `gad:` is the preferred prefix.

# Milestone Lifecycle

Manages milestone boundaries — the transitions between "shipping v1" and "starting v2". A milestone is a named set of phases that ship together. Closing one cleanly and starting the next is what keeps planning from accumulating drift.

## Detecting mode

Three modes based on context:

- **`audit`** — all or most phases are done; user wants to verify before closing
- **`close`** — audit passed; archive the milestone and tag the release  
- **`new`** — starting fresh work after a closed milestone (or for a new product direction)

Read STATE.md and ROADMAP.md first to determine which mode applies.

---

## Mode: Audit (pre-close integrity check)

Before archiving a milestone, verify it actually delivered what it promised.

### Step 1: Check phase completion

Read ROADMAP.md. For each phase:

| Phase | Status | DoD verified? | SUMMARY.md exists? |
|-------|--------|--------------|-------------------|
| `app-auth-01` | done | ✓ | ✓ |
| `app-data-01` | done | ✓ | ✓ |
| `app-ui-02` | done | ✗ missing | ✗ missing |

Flag any phase that is `done` without a verified DoD or SUMMARY.md — these are soft closes.

### Step 2: Check requirements coverage

Read REQUIREMENTS.md. For each v1 requirement:
- Is it marked as delivered? (checkbox or status)
- Is there a phase in ROADMAP.md that covers it?
- Does a SUMMARY.md or VERIFICATION result confirm it shipped?

```
Requirements audit:
  AUTH-01 ✓ — delivered in app-auth-01
  AUTH-02 ✓ — delivered in app-auth-01
  DATA-03 ✗ — no phase covers this requirement
  UI-04 ⚠ — phase done but no verification
```

### Step 3: Check for tech debt and open questions

Scan ERRORS-AND-ATTEMPTS.md and DECISIONS.md for anything flagged as "revisit later" or unresolved. List them — the user decides whether they block the milestone close or carry forward.

### Step 4: Audit result

**If all requirements covered, all phases verified:**
```
Milestone audit: PASSED

All N phases complete, all requirements covered.
Ready to close. Run rp-milestone close when ready.
```

**If gaps found:**
```
Milestone audit: GAPS FOUND

Missing coverage:
  - DATA-03: no phase covers this requirement
  - app-ui-02: phase done but DoD not verified

Options:
  1. Close gaps first — add tasks to cover these before closing
  2. Defer to next milestone — explicitly mark these as v2
  3. Close anyway — acknowledge the gaps and move on
```

---

## Mode: Close (archive and tag)

After audit passes (or gaps are explicitly deferred):

### Step 1: Update REQUIREMENTS.md

Move any explicitly deferred requirements to a "v2" section:

```markdown
## Deferred to v2

| Id | Requirement | Reason |
|----|-------------|--------|
| `DATA-03` | <requirement> | deprioritized post-audit |
```

### Step 2: Archive phase directories

Move completed phase dirs to an archive:

```bash
mkdir -p .planning/milestones/v1-phases/
mv .planning/phases/* .planning/milestones/v1-phases/
```

### Step 3: Snapshot the milestone in ROADMAP.md

Collapse the milestone phases into a single summary line:

```markdown
## v1.0 (archived — <date>)

<N> phases shipped. Requirements: AUTH-01 through DATA-03.
See `.planning/milestones/v1-phases/` for phase history.
```

### Step 4: Tag the release

```bash
git tag -a v1.0 -m "v1.0 — <milestone summary>"
git push --tags
```

### Step 5: Reset STATE.md for the next cycle

```markdown
# State

## Registry

| Field | Value |
|-------|-------|
| `status` | `planning` |
| `updated` | <date> |

## Current cycle

| Field | Value |
|-------|-------|
| `phase` | — |
| `focus` | v1.0 closed. Planning v2 — run rp-milestone new to start. |

## Next queue

| Priority | Action | Type |
|----------|--------|------|
| `1` | run rp-milestone new to kick off v2 | `planning` |
```

```
Milestone v1.0 closed.

Tagged: v1.0
Archived: .planning/milestones/v1-phases/
State: reset for v2 planning

Next: rp-milestone new OR rp-new-project --milestone to start the next cycle.
```

---

## Mode: New (start next milestone)

Starting a new milestone for an existing project — new goals, continuing phase numbering.

### Step 1: Review what shipped

Read the archived milestone summary and REQUIREMENTS.md v2 section. Understand what carries forward.

### Step 2: Gather new goals

Ask (conversationally):

1. **What's the focus of this milestone?** (one sentence)
2. **What did v1 ship that we're building on?**
3. **What new capabilities are we targeting?**
4. **What's explicitly out of scope for this milestone?**
5. **Any constraints?** (timeline, tech debt to address, dependencies)

### Step 3: Update PROJECT.md

Add a new milestone section:

```markdown
## Milestone: v2.0

**Focus:** <one sentence>
**Building on:** v1 ships [list key v1 capabilities]
**New targets:** [list new goals]
**Out of scope:** [list explicit exclusions]
**Constraints:** [any constraints]

---
*Started: <date>*
```

### Step 4: Write new requirements

Append to REQUIREMENTS.md (don't delete v2 deferred items — promote or re-scope them):

```markdown
## v2 Requirements

### Active

| Id | Requirement | Status |
|----|-------------|--------|
| `V2-AUTH-01` | <requirement> | `planned` |

### Carried forward from v1

| Id | Requirement | Original | Status |
|----|-------------|----------|--------|
| `DATA-03` | <requirement> | v1 deferred | `active` |
```

### Step 5: Create new roadmap phases

Using the same approach as `rp-plan-phase` — derive phases from new requirements, map every requirement to exactly one phase. Phase IDs continue from where v1 left off (don't restart numbering).

Update ROADMAP.md with the new phases.

### Step 6: Update STATE.md

```markdown
## Current cycle

| Field | Value |
|-------|-------|
| `phase` | v2.0 kickoff — phases defined, planning next |
| `focus` | run rp-plan-phase for the first v2 phase |
```

```
Milestone v2.0 started.

Requirements: N new + M carried forward
Phases: N defined in ROADMAP.md

Next: rp-plan-phase for phase <first-v2-phase-id>
```
