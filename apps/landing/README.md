# RepoPlanner landing site

Single-page Next.js app (App Router, Tailwind v4, shadcn-style primitives under `components/ui/`).

## Deploy on Vercel

1. Import [MagicbornStudios/RepoPlanner](https://github.com/MagicbornStudios/RepoPlanner) (or use your existing project).
2. **Production branch:** **`main`** (this is the pre-skills framework line + this landing app).
3. **Root Directory:** **`apps/landing`**.
4. **Node.js:** 22.x.
5. Install and build use **`npm ci`** / **`npm run build`** via **`vercel.json`** (committed `package-lock.json`).

Vercel must **not** install from the repo root `pnpm-lock.yaml` — set the root directory to `apps/landing` so only the Next app’s lockfile is used.

## Local

```bash
cd apps/landing
npm install
npm run dev
```

Open `http://localhost:3040`.
