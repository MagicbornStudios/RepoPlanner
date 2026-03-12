# RepoPlanner Desktop

Neutralino desktop wrapper for the planning cockpit. **Loads the planning app at `http://localhost:3101`** – no static export.

## Run

1. **Start the planning server** (in a repo that has a `.planning` directory), e.g. from a host repo:
   ```bash
   pnpm planning:standalone
   ```
   The planning app runs at http://localhost:3101.

2. **Start the desktop app** (from this directory):
   ```bash
   npm run run
   ```
   Or from RepoPlanner root: `npm run run --prefix desktop`.

The desktop window shows the planning cockpit. If the window is blank, ensure the planning server is running. On Windows, loopback access for the WebView host may need to be enabled (see main README or host repo docs).

## Build

```bash
npm run build
# or
npm run build:release
```

Binaries are in `desktop/dist/`. CI (Ubuntu) only produces Linux binaries. **For Windows or macOS**, run the same commands locally on that OS; the binary and `resources.neu` will be in `desktop/dist/`. Downloadable builds are on [GitHub Releases](https://github.com/MagicbornStudios/RepoPlanner/releases) and as workflow artifacts.
