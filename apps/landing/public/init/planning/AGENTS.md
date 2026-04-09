# Agent loop — skillless Ralph

This is a **skillless** take on the **Ralph Wiggum loop**: the agent reads durable state from disk, does **one** concrete task, updates the XML/Markdown record, and commits. There is **no** skills framework here — no trigger files, no skill packs — only **files + optional CLI + optional cockpit** in a host app.

## Where it fits

RepoPlanner is **especially comfortable on existing repos**: real directories, tests, CI, and git history give tasks meaningful verification commands. You can use the same loop on a young repo too — the point is to keep **one** `.planning/` home for roadmap, state, and tasks instead of scattering notes across issues and ad hoc markdown.

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
