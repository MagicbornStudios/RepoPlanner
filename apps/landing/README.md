# RepoPlanner landing site

Single-page Next.js app (App Router, Tailwind v4, shadcn-style primitives under `components/ui/`).

## Deploy on Vercel

1. Create or use the [repo-planner](https://vercel.com) project.
2. Set **Root Directory** to `apps/landing` (this repository’s path to this folder).
3. Install command: `pnpm install` (default). Build: `pnpm build`. Output: Next.js default.

Node **22+** matches the parent package engines.

## Local

```bash
cd apps/landing
pnpm install
pnpm dev
```

Open `http://localhost:3040`.
