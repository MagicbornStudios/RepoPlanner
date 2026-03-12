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

```bash
# Add RepoPlanner as a submodule
git submodule add https://github.com/MagicbornStudios/RepoPlanner.git vendor/repo-planner
git submodule update --init --recursive

# Run the CLI from your repo root (so it sees your .planning/)
node vendor/repo-planner/scripts/loop-cli.mjs snapshot
```

Or in `package.json`: `"planning": "node vendor/repo-planner/scripts/loop-cli.mjs"`.

### Desktop app

1. Download the latest build from [Releases](https://github.com/MagicbornStudios/RepoPlanner/releases) (or use the **repoplanner-desktop-zips** artifact from a [workflow run](https://github.com/MagicbornStudios/RepoPlanner/actions)).
2. Start the planning server in a repo that has `.planning/` (e.g. in that repo: `pnpm planning:standalone` or equivalent).
3. Run the desktop binary; it opens a window that loads the planning cockpit at `http://localhost:3101`.

### Web app (browser)

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
| `api/`, `components/`, `lib/` | Next.js API routes and React UI consumed by the host planning app. |
| `.planning/templates/` | XML/MD templates for STATE, ROADMAP, TASK-REGISTRY, etc. |

---

## Host integration (Next.js)

1. **CLI** — Run from host root so the CLI uses the host’s `.planning/` as the planning root.
2. **UI** — The host app renders the planning cockpit (e.g. `PlanningCockpit`). RepoPlanner ships `planning.css` with scoped tokens; override `--planning-status-*` and `--planning-diff-*` in your theme if you like.
3. **Agent loop** — Agents run the CLI, register in STATE, claim tasks in TASK-REGISTRY, and read REQUIREMENTS/REFERENCES. The submodule does not replace the host’s `.planning/` data.

See [INSTALL.md](./INSTALL.md) for path aliases, CSS tokens, and install-routes.

---

## Deployment (Vercel)

To run the **planning web app** on Vercel:

- Use a host repo that contains the Next.js planning app (e.g. a monorepo with `packages/planning`).
- In Vercel, set **Root Directory** to that package (e.g. `packages/planning`).
- Set **Build Command** to `pnpm build` (or `npm run build`) and **Output** to the default Next.js output.
- Optionally set `REPOPLANNER_PROJECT_ROOT` if the app should resolve `.planning` from a different path (e.g. in serverless, a read-only mount or env-based path).
- **Secrets** — Only needed for optional features: GitHub OAuth (`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_SECRET`) and similar. The app runs without them; those features are feature-flagged off when env vars are missing.

---

## Versioning

Tag or pin the submodule commit in the host repo so upgrades are intentional. Check [Releases](https://github.com/MagicbornStudios/RepoPlanner/releases) for desktop builds and release notes.

---

## Contributing

Issues and pull requests are welcome. This project is maintained as part of the [Magicborn Studios](https://github.com/MagicbornStudios) ecosystem and was developed with support for agentic workflows and the [OpenAI Open Source Fund](https://openai.com/index/open-source-fund-2025/).

---

## License

See [LICENSE](./LICENSE) in this repository.
