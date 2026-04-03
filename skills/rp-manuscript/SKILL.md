---
name: rp-manuscript
description: Fiction and creative writing adaptation of the RepoPlanner loop — the manuscript loop. Use this skill whenever working on a novel, book series, creative writing project, or story outline that uses planning documents. Triggers on: AGENTS.md with "fiction" or "manuscript" language, beat sheets, state files with narrative fronts or forward questions, task registries with chapter IDs, decisions files with MT-* or ML-* canon locks, or any project under books/<slug>/. Also use when the user says "draft chapter", "work on the novel", "lock a beat", "add a forward question", "canon lock this", or asks what story work to do next. The manuscript loop extends the standard 5-doc planning loop with fiction-specific vocabulary and verification patterns.
---

# Manuscript Loop

The same 5-doc planning loop adapted for fiction. The core principle is identical: structured, living documents that an agent and an author share as a single source of truth. The difference is vocabulary and verification — story work replaces engineering tasks, beat sheets replace architecture diagrams, and the chapter done checklist replaces passing tests.

## Story vocabulary

| Term | Meaning |
|------|---------|
| **Series** | A set of related novels sharing a world (e.g. the Magicborn line) |
| **Book / Volume** | A single published work (e.g. *Mordred's Tale*) |
| **Part** | A volume subdivision for multi-volume rollout (Part I, Part II, Part III) |
| **Act** | Narrative arc within a book (Act I, Act II, Act III) |
| **Chapter** | Named chapter unit, the primary drafting grain |
| **Scene** | A single continuous unit of POV + location + action within a chapter |
| **Beat** | A specific story moment that must land on the page (action, revelation, emotional turn) |
| **Beat sheet** | A chapter's planned beats — the spec before drafting |
| **Forward question (FQ)** | An open story question that needs to be resolved before or during drafting |
| **Canon lock** | A decision that fixes story facts, preventing drift across sessions |
| **Manuscript position** | The current chapter + page/beat the draft has reached |

## Two layers of planning

Fiction projects in a monorepo use two distinct planning layers:

**Section-level** (`docs/books/planning/`) — cross-book concerns:
- Reader and publishing engineering phases
- Series continuity, world order, shared lore
- Section requirements and EPUB build decisions
- Cross-title beat coordination (e.g. which book ships first)

**Per-novel** (`docs/books/<slug>/planning/`) — story work:
- This novel's phases (beats pass, drafting, rework, polish)
- Beat sheets, narrative fronts, manuscript position
- Canon locks and forward questions
- Fiction-only `AGENTS.md`

When working on prose or story beats, you are almost always in the per-novel layer. When working on reader features, publishing pipelines, or EPUB output, you are in the section layer.

## Agent read order (fiction)

Before any manuscript work, read in this order:

1. `AGENTS.md` in the novel's planning folder — fiction-only rules, non-negotiables, loop steps
2. Section `state.mdx` (Magicborn line / series order section) — when a change might affect cross-title beats
3. Novel `roadmap.mdx` — current phase and what comes next
4. Novel `state.mdx` — **this is the cockpit**: beat sheets, narrative fronts, manuscript position, forward questions, next queue
5. Novel `task-registry.mdx` — the specific tasks and their status
6. Novel `decisions.mdx` — **canon locks are law for prose** — do not contradict without a new decision row

## The 5 docs (fiction flavour)

| Doc | Fiction meaning | When updated |
|-----|----------------|--------------|
| `requirements` | Section scope, delivery format (EPUB), series goals, non-goals | When scope changes |
| `roadmap` | Phase sequence: beats pass → act drafting → rework → polish → packaging | When phases open/close |
| `state` | Beat sheets by chapter, narrative fronts, manuscript position, forward questions, next queue | Every session |
| `task-registry` | Writing tasks: beat workshops, chapter drafts, rework passes, sweeps | As tasks move |
| `decisions` | Canon locks — story facts, tone rules, character arcs — do not relitigate | When a choice crystallizes |
| `errors-and-attempts` | Story paths that didn't work — abandoned beats, failed scene approaches | When a direction fails |

## State file: what it holds for fiction

The state file does more work in fiction than in software. It holds:

**Registry section** — book slug, series position, source path, status, draft goal

**Beat sheets** — chapter-by-chapter plan with "Locked for draft" columns:
```md
| Chapter | Working title | Beats | Locked for draft |
|---------|--------------|-------|-----------------|
| Ch3 | The Changed World | Morgana taken; Jack searches | MT-CH3-INTERCUT-REALIGN |
```

**Narrative fronts** — tone, series feel, what "good" looks like:
```md
| Field | Value |
| `feel` | Darker, high emotion, tragic stakes, survivors who stay potent |
| `thematic` | Origins of Magicborn; first cause; power and cost |
```

**Draft targets** — words per page, chapter target, series structure

**Manuscript position** — current chapter, where the draft is right now

**Forward questions** — open story questions, blocking or non-blocking:
```md
| Id | Question | Blocking? | Status |
|----|----------|-----------|--------|
| FQ-01 | Does Mordred know Jack is his father? | yes | open |
```

**Next queue** — the one or two tasks to work on next, in order

## Task IDs (fiction)

Fiction tasks use the same segment pattern as software tasks but with story-specific streams:

```
<book-abbrev>-<phase>-<task>
```

**Examples:**
- `mt-beats-01-ch07` — Mordred's Tale → beats pass 01 → chapter 7 workshop
- `mt-act2-01-ch9` — Mordred's Tale → Act II → chapter 9 draft
- `ml-outline-01` — Mordred's Legacy → outline phase 01
- `mrp-draft-01` — Magicborn: The Rune Path → draft phase 01

Common phase names: `beats-pass-01`, `act-i`, `act-ii`, `act-iii`, `polish`, `trilogy-packaging-01`

## Canon locks (decisions file)

Canon locks are decisions that fix story facts. They prevent drift — when an agent or author forgets a choice made three sessions ago, the lock holds.

ID format: `<BOOK-ABBREV>-<TOPIC>` in all caps (e.g. `MT-ENID-BRIGHT-SPELL-ARC`, `MT-MAGICBORN-SERIES-FEEL`)

A canon lock row:
```md
| Id | Status | Summary | Consequence |
|----|--------|---------|-------------|
| MT-CHAPTER-AT-A-TIME | accepted | Draft one full chapter at a time; one rework pass before moving on | Prevents page-level perfectionism from stalling completion |
```

**Rules:**
- Once `accepted`, a canon lock is law for prose — do not write against it without creating a new decision row
- When a forward question resolves, promote it to a decision with `MT-FQ-XX-...` id and strike it from the FQ list
- Forward questions in state → decisions on resolution; never leave them in limbo

## Forward questions lifecycle

Forward questions are open story questions captured in state. They have three fates:

1. **Resolved** → promote to a `decisions` row with a `MT-FQ-XX-` id; strike from state FQ list
2. **Deferred** → mark `deferred` in state; note which phase will resolve them
3. **Abandoned** → the question doesn't matter anymore; remove with a note

Never let FQs pile up unreviewed — a growing unresolved FQ list is a planning health warning.

## Chapter execution loop

Repeat for each chapter after its beat sheet is locked:

1. **Recap** — prior chapter ending, what characters know, emotional temperature, open hooks
2. **Draft** — write the full chapter in one pass (not page by page); beats as spec
3. **Structure read** — check beat coverage, scene causality, moral/shock pass per series feel
4. **One rework** — chapter-level pass (continuity, POV balance, tone)
5. **Checklist gate** — chapter done checklist must pass before marking done
6. **Update state** — refresh manuscript position, advance next queue, capture any new FQs

**Never skip the recap.** Prose continuity breaks happen when agents start a chapter cold.

## Chapter done checklist (Definition of Done)

A chapter is not done until all of these pass:

| Check | Pass criteria |
|-------|--------------|
| `beats-landed` | All beat-sheet beats are on the page in scene form — not notes |
| `scene-causality` | Each scene causes the next or creates pressure; no orphan scenes |
| `character-motive` | POV character motive is explicit; decisions are understandable even when flawed |
| `canon-consistency` | Timeline, magic rules, and named facts match decisions and state |
| `act-handoff` | Chapter ending creates a clean handoff into the next chapter/act objective |
| `dialogue-interiority` | Chapter has both dialogue and interior reaction beats; no long unreadable exposition |
| `placeholder-policy` | No TODO placeholders except wording-level polish notes; missing plot beats are not allowed |
| `read-through` | One full read-through complete; obvious logic gaps and awkward transitions fixed |
| `build-check` | `pnpm run build:books` passes after chapter save (when applicable) |

The build check catches metadata and EPUB structure issues, not story quality — run it even for prose-only changes to avoid accumulating build debt.

## Verification (fiction)

There are no automated unit tests for story. The two verification gates are:

- **Chapter done checklist** — content quality gate (above)
- **`pnpm run build:books`** — structural gate; EPUB output must build without errors

Run both after any chapter that modifies `book.json`, chapter metadata, or EPUB structure. For pure prose edits in an existing chapter, the read-through + checklist is sufficient; run the build before marking the task done.

## Per-book AGENTS.md

Every novel planning folder should have an `AGENTS.md` with fiction-specific rules. It's intentionally short — details live in state and decisions. It should cover:

1. **Canonical tutorial** — point at the public blog article or equivalent reference
2. **Read order** — the exact order an agent must read files before touching prose
3. **What "implementation" means** — planning edits, manuscript edits, what's NOT implementation
4. **The per-chapter loop** — the five steps, condensed
5. **Spillover policy** — new canon questions → FQ; beats that force earlier chapters → rework row in registry
6. **Verification** — no unit tests; checklist + build
7. **Relationship to software agents** — ignore test requirements for pure prose tasks

## Beats pass before drafting

Do not draft chapters without locked beats. The beats pass is its own phase:

1. Run a chapter-by-chapter Q&A workshop: what happens, who has POV, what are the alternatives
2. Lock one path per alternative block — write it into the beat sheet
3. Promote answered questions to decisions; strike them from the FQ list
4. Mark each chapter's beat sheet as "Locked for draft" before that chapter moves to drafting

If a chapter's beats are not locked, the task status stays `blocked` until the beats pass reaches it.

## Spillover and scope discipline

When working on a chapter, scope stays at the chapter level. If execution uncovers work that belongs in a different chapter or phase:

- **New canon question** → forward question in state (not inline in prose comments or only in chat)
- **Beat forces an earlier chapter change** → new rework row in the task registry; no silent scope creep
- **Task is larger than one chapter** → surface it, split the task, don't silently expand

## Planning pack and EPUB embed

For repos using the `repub-builder` CLI, planning docs can ride along as appendix XHTML in the EPUB spine:

```bash
repub epub ./books/<slug> --planning ./docs/books/planning --output ./out.epub
```

Per-book `book.json` can declare `epubPlanningDirs` to automate this via `pnpm run build:books`. The planning pack is the shared memory between the site, the EPUB, and the agent — keep it synchronized.

## File structure (per novel)

```
docs/books/<slug>/
  planning/
    AGENTS.md          ← fiction-only agent rules (not routed as MDX)
    roadmap.mdx        ← phase sequence (mt-* phases)
    state.mdx          ← beat sheets, narrative fronts, manuscript position, FQs, next queue
    task-registry.mdx  ← writing tasks with chapter-level IDs
    decisions.mdx      ← canon locks (MT-*, ML-*, MRP-*)

books/<slug>/          ← manuscript source
  chapters/
    00-prologue.md
    01-chapter-name.md
    ...
  book.json            ← EPUB metadata, chapter list, epubPlanningDirs
```
