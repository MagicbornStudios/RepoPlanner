# Agent loop — skillless Ralph (brownfield only)

This is a **skillless** take on the **Ralph Wiggum loop**: the agent reads durable state from disk, does **one** concrete task, updates the XML/Markdown record, and commits. There is **no** skills framework here — no trigger files, no skill packs — only **files + optional CLI + optional cockpit** in a host app.

## Scope

**Brownfield only.** RepoPlanner assumes an existing codebase: real directories, tests, CI, and git history. It does **not** replace product discovery or greenfield scaffolding; it gives you a **thin, inspectable** planning layer on top of code that already exists.

## Loop (every iteration)

1. **Snapshot** — run your host’s planning CLI (`snapshot` / `checklist`) or open the cockpit so the current phase and next action are obvious.
2. **Pick** — choose exactly one `planned` task in `TASK-REGISTRY.xml` (or split work until you can).
3. **Implement** — touch the smallest surface that completes the task; run the listed verification commands.
4. **Record** — update `STATE.xml`, task status, `DECISIONS.xml` if you changed approach, `ERRORS-AND-ATTEMPTS.xml` if something failed.
5. **Commit** — one commit per task when possible (discipline for per-task traceability).

## Where narrative lives

- **REQUIREMENTS.md** (repo root) — long-form scope, roadmap tables, cross-cutting queue.
- **.planning/*.xml** — machine-friendly timeline, tasks, state — the cockpit and CLI summarize these.

## Optional CLI

Add a `package.json` script pointing at `repo-planner` / `loop-cli.mjs` if you want agents to run `snapshot` without opening the UI.
