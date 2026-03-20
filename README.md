# RepoPlanner

**Orchestrate planning loops, agent tasks, and roadmaps across repos—CLI, desktop app, and web.**

RepoPlanner gives you a single contract (STATE, TASK-REGISTRY, ROADMAP, phases) and tooling so humans and AI agents can run a shared planning loop. Use it as a **git submodule** in any repo, or run the **desktop app** and **web app** to manage planning from one place.

[![MagicbornStudios/RepoPlanner](https://img.shields.io/badge/GitHub-MagicbornStudios%2FRepoPlanner-blue?logo=github)](https://github.com/MagicbornStudios/RepoPlanner)  
**→ [INSTALL.md](./INSTALL.md)** · **→ [STYLING.md](./STYLING.md)**

---

## Why RepoPlanner?

- **One source of truth** — `.planning/` holds STATE, TASK-REGISTRY, ROADMAP, and phase docs. No scattered spreadsheets or opaque backlogs.
- **Agent-friendly** — CLI and APIs are built for AI agents (e.g. Cursor, Codex, MCP): snapshot, claim tasks, report progress, iterate.
- **Works everywhere** — CLI from the host repo, desktop binary for a native window, or deploy the web app (e.g. Vercel) and use it in the browser. Optional GitHub OAuth lets users connect repos in the web version.
- **Open source** — MIT-friendly; built for the [OpenAI Open Source Fund](https://openai.com/index/open-source-fund-2025/) and the broader agentic-workflow community.

---

## Features

| Feature | Description |
|--------|-------------|
| **CLI** | `snapshot`, `new-agent-id`, report generation, migrations. Run from host repo root; reads that repo’s `.planning/`. |
| **Desktop app** | Neutralino-based binary (Windows, macOS, Linux). Downloads from [Releases](https://github.com/MagicbornStudios/RepoPlanner/releases). Connects to the same planning server as the web app. |
| **Web app** | Next.js planning cockpit: dashboard, tasks, roadmap, chat, reports. Deploy to **Vercel** (or any Node host) and use in the browser. Optional GitHub OAuth to connect repos. |
| **Templates** | XML/MD templates for PLAN, SUMMARY, ROADMAP, TASK-REGISTRY, DECISIONS. Copy into your repo’s `.planning/templates/` or use as reference. |
| **Host integration** | Drop-in React components and API routes; styling via CSS variables. Fits into any Next.js app that has a `.planning` directory (or points to one). |

---

## Quick start

### CLI (from a host repo)

Run the CLI from the repo that contains your `.planning/` (host repo root when used as submodule, or RepoPlanner repo root when using RepoPlanner standalone).

```bash
# Add RepoPlanner as a submodule
git submodule add https://github.com/MagicbornStudios/RepoPlanner.git vendor/repo-planner
git submodule update --init --recursive

# From host repo root (so the CLI sees your .planning/)
node vendor/repo-planner/scripts/loop-cli.mjs init
node vendor/repo-planner/scripts/loop-cli.mjs snapshot
# or: npx repo-planner snapshot (if RepoPlanner is published)
# or in package.json: "planning": "node vendor/repo-planner/scripts/loop-cli.mjs" then: pnpm planning init && pnpm planning snapshot
```

**Greenfield:** After adding the submodule, run **`init`** once to create `.planning/` (templates, STATE, TASK-REGISTRY, ROADMAP, REQUIREMENTS, phase `01-greenfield`, `reports/.gitkeep`) and a starter **`AGENTS.md`** at the repo root. Options: `--force` (overwrite bootstrap files), `--no-agents-md` (skip AGENTS.md). Same as **`planning setup init`**.

From a RepoPlanner clone: `pnpm exec repo-planner snapshot` or `pnpm repo-planner snapshot` (add `"repo-planner": "repo-planner"` script to run the bin).

**When you need the CLI:** Not required when using the **desktop app** (it talks to the planning server) or **web-only** viewing. Use the CLI for **agents** (Cursor, Codex, MCP), **headless** runs, and **CI** (e.g. snapshot, new-agent-id, report generation).

**Dual loop (host vs RepoPlanner):** From a host repo you can run the loop for RepoPlanner’s own `.planning/` (e.g. to track RepoPlanner product work) without mixing with the host’s loop. Use `--root vendor/repo-planner` or `REPOPLANNER_PROJECT_ROOT=vendor/repo-planner` with the CLI; add a host script like `planning:repoplanner` that runs the CLI with `--root vendor/repo-planner`. For a **RepoPlanner-focused dashboard**, start the planning dev server with `REPOPLANNER_PROJECT_ROOT=vendor/repo-planner` (or from this repo `pnpm web:dev`) so the UI and APIs use only RepoPlanner `.planning/` and the CLI resolves to `scripts/loop-cli.mjs`; from the host you can run `pnpm planning:standalone:repoplanner` so the UI and APIs show RepoPlanner’s state, roadmap, and tasks.

### Desktop app

1. Download the latest build from [Releases](https://github.com/MagicbornStudios/RepoPlanner/releases) (or use the **repoplanner-desktop-zips** artifact from a [workflow run](https://github.com/MagicbornStudios/RepoPlanner/actions)).
2. Start the planning server in a repo that has `.planning/` (e.g. in that repo: `pnpm planning:standalone` or equivalent).
3. Run the desktop binary; it opens a window that loads the planning cockpit at `http://localhost:3101`.

### Run from the RepoPlanner repo

From this repo you can run the web app and desktop without a host:

- **Web:** `pnpm web:dev` (dev server at http://localhost:3101), `pnpm web:build`, `pnpm web:start`
- **Desktop:** `pnpm desktop:run` (Neutralino window), `pnpm desktop:build` / `pnpm desktop:build:release`
- **CLI:** `pnpm exec repo-planner snapshot` or `pnpm planning snapshot` (if the bin is installed)

Install dependencies in `web/` first: `pnpm --dir web install` (or from repo root with a workspace that includes `web`).

### Web app (browser) from a host

Hosts that embed RepoPlanner (e.g. [DungeonBreak-docs](https://github.com/MagicbornStudios/DungeonBreak-docs)) run a Next.js planning app. From the host repo:

- **Default dev (web):** `pnpm planning:dev` — starts the server and opens the cockpit in the browser.
- **Desktop dev:** `pnpm desktop` — same server plus the Neutralino window.

The **web app can be deployed to Vercel**: set the project root to the package that contains the planning Next app (e.g. `packages/planning`), add `REPOPLANNER_PROJECT_ROOT` if needed, and deploy. No API keys or secrets are required for core features; optional integrations (e.g. GitHub OAuth) are feature-flagged and only enabled when the corresponding env vars are set.

---

## Repository layout

| Path | Purpose |
|------|--------|
| `scripts/loop-cli.mjs` | Planning CLI entrypoint. |
| `desktop/` | Neutralino app config and build; produces the desktop binary. |
| `.github/workflows/release.yml` | Builds desktop artifacts and (on tag) publishes to Releases. |
| `web/` | Next.js planning cockpit (app router, API routes, UI). Run from this repo with `pnpm --dir web run dev`; host repos can delegate to it. |
| `api/`, `components/`, `lib/` | API routes and React UI consumed by `web/` or by a host planning app. |
| `.planning/templates/` | XML/MD templates for STATE, ROADMAP, TASK-REGISTRY, etc. RepoPlanner ships **only** these templates; the **live** `.planning/` (STATE.xml, TASK-REGISTRY.xml, etc.) lives in the **project you’re planning** (host repo or the repo pointed at by `REPOPLANNER_PROJECT_ROOT`). When you run the CLI or web app, the “project root” is that repo, not this one. |

---

## Host integration (Next.js)

1. **CLI** — Run from host root so the CLI uses the host’s `.planning/` as the planning root.
2. **UI** — The host app renders the planning cockpit (e.g. `PlanningCockpit`). RepoPlanner ships `planning.css` with scoped tokens; override `--planning-status-*` and `--planning-diff-*` in your theme if you like.
3. **Agent loop** — Agents run the CLI, register in STATE, claim tasks in TASK-REGISTRY, and read REQUIREMENTS/REFERENCES. The submodule does not replace the host’s `.planning/` data.

See [INSTALL.md](./INSTALL.md) for path aliases, CSS tokens, and install-routes.

---

## Deployment (Vercel)

The planning Next app can live in a host monorepo (e.g. `packages/planning`) or, for a self-contained deploy, inside this repo (e.g. `web/` once added).

**Deploy from a host monorepo** (e.g. DungeonBreak-docs):

- Root Directory = the package that contains the Next.js planning app (e.g. `packages/planning`).
- Build/install from repo root so `vendor/repo-planner` is available.
- Optionally set `REPOPLANNER_PROJECT_ROOT` if the app should resolve `.planning` from a different path.
- **Secrets** — Only needed for optional features: GitHub OAuth (`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_SECRET`). The app runs without them; those features are feature-flagged off when env vars are missing.

**Deploy from the RepoPlanner repo:**

- Set **Root Directory** to `web`. Build runs from `web/` (Next.js app).
- If Vercel fails with "lockfile is not up to date", the project uses `web/vercel.json` with `installCommand: "pnpm install --no-frozen-lockfile"`. Alternatively set **Install Command** in the Vercel project to `pnpm install --no-frozen-lockfile`, or commit an up-to-date `web/pnpm-lock.yaml` after running `pnpm install` in `web/`.
- Optionally set `REPOPLANNER_PROJECT_ROOT` if the deployed app should resolve a different project (e.g. for a future “connect repo” flow).

---

## Versioning

Tag or pin the submodule commit in the host repo so upgrades are intentional. Check [Releases](https://github.com/MagicbornStudios/RepoPlanner/releases) for desktop builds and release notes.

---

## Contributing

Issues and pull requests are welcome. This project is maintained as part of the [Magicborn Studios](https://github.com/MagicbornStudios) ecosystem and was developed with support for agentic workflows and the [OpenAI Open Source Fund](https://openai.com/index/open-source-fund-2025/).

---

## License

See [LICENSE](./LICENSE) in this repository.
