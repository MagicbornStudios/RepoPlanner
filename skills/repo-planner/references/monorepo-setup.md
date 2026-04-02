# Monorepo Planning Setup

How to layer planning docs across a multi-app monorepo.

## Three layers

```
Repo root
├── AGENTS.md                        ← monorepo agent read order + gates
├── REQUIREMENTS.md                  ← stub only; real requirements in docs/
├── .planning/                       ← machine loop (XML)
│   ├── planning-config.toml
│   ├── ROADMAP.xml
│   ├── STATE.xml
│   ├── TASK-REGISTRY.xml
│   ├── DECISIONS.xml
│   ├── REQUIREMENTS.xml             ← stub pointing at doc sources
│   └── AGENTS.md                   ← planning-specific read order
│
└── apps/<section>/content/docs/<section>/   ← MDX human narrative
    ├── requirements.mdx             ← section scope + requirements
    └── planning/
        ├── planning-docs.mdx        ← playbook/index for this section
        ├── roadmap.mdx
        ├── state.mdx
        ├── task-registry.mdx
        ├── decisions.mdx
        ├── errors-and-attempts.mdx
        └── plans/<phase-id>/
            ├── KICKOFF.mdx
            ├── PLAN.mdx
            └── SUMMARY.mdx          ← written after phase closes
```

## Which layer owns what

| Work type | Track in |
|-----------|----------|
| Touches only one section's code and audience | Section task registry, section roadmap |
| Spans CI, multiple apps, shared standards | Global `.planning/` XML + global state/task-registry MDX |
| Coordination needed but section owns delivery | Global points to section phase IDs |

## Global vs section in practice

**Global layer** (`docs/global/` or `.planning/`):
- Cross-cutting queue (items affecting multiple sections)
- Monorepo-wide gates (CI, auth baseline, shared providers)
- Shared planning policy decisions

**Section layer** (`docs/<section>/planning/`):
- Everything scoped to one app or product area
- Section-local task IDs (`<namespace>-<stream>-<phase>-<task>`)
- Requirements, roadmap, state specific to that section

## ID namespace = section folder name

The `namespace` segment of a phase ID matches the docs folder name:

| Section | Namespace | Example ID |
|---------|-----------|------------|
| `docs/books/` | `books` | `books-reader-03-02` |
| `docs/documentation/` | `documentation` | `documentation-site-10-05` |
| `docs/global/` | `global` | `global-auth-03` |
| `apps/blog/` | `blog` | `blog-content-01-01` |

Keep namespace stable — renaming a section means updating all its IDs everywhere.

## Cross-reference conventions

**Global → section:** link the live path + name the phase ID:
```
Phase `books-reader-03` — see [Books task registry](/docs/books/planning/task-registry)
```

**Section → global:** point at global state or `.planning/` files + name the row:
```
Cross-cutting work tracked in [documentation/state](/docs/documentation/planning/state) cross-cutting queue.
```

**In commits:** include the phase ID in the commit message:
```
feat(books-reader-03): add EPUB progress sync
```

## planning-docs.mdx — the section playbook

Each section has a `planning-docs.mdx` (or `planning-docs.md`) that acts as the index for that section's planning. It should contain:

```markdown
## Registry

| Record | Purpose |
|--------|---------|
| [Requirements](/docs/<section>/requirements) | section scope |
| [Roadmap](/docs/<section>/planning/roadmap) | active phases |
| [State](/docs/<section>/planning/state) | current cycle + next queue |
| [Task registry](/docs/<section>/planning/task-registry) | task rows |
| [Decisions](/docs/<section>/planning/decisions) | stable rules |

## Loop

| Step | Rule |
|------|------|
| `1` | update these planning docs before starting section work |
| `2` | execute one logical task |
| `3` | verify (build, tests) |
| `4` | write the new state back into these records |

## Agent context (read order)
For this section's work: requirements → roadmap → state → task-registry → decisions.
```
